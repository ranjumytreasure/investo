# Auction System Implementation Plan

## Overview
This document outlines the step-by-step implementation plan for the enhanced auction system with WebSocket notifications, cron jobs, and proper date management.

---

## Phase 1: Database Schema Changes

### 1.1 Rename `first_auction_date` to `next_auction_date`
- **File**: `server/src/scripts/renameFirstAuctionDateToNext.ts`
- **Action**: 
  - Rename column `first_auction_date` → `next_auction_date` in `groups` table
  - Add new column `next_auction_date` (if needed for backward compatibility)
  - Migration script to handle existing data

### 1.2 Update Group Model
- **File**: `server/src/models/Group.ts`
- **Changes**:
  - Rename `first_auction_date` → `next_auction_date` in interface and model
  - Keep `next_auction_date: Date | null` (already exists after Phase 1.1)

---

## Phase 2: Auction Opening Logic (Cron Job)

### 2.1 Update Cron Job to Check `next_auction_date` + `auction_start_at`
- **File**: `server/src/cron/auctions.ts`
- **Logic**:
  - Combine `next_auction_date` (date) + `auction_start_at` (time) to get full datetime
  - Find groups where:
    - `next_auction_date` is today or earlier
    - Combined datetime (`next_auction_date` + time from `auction_start_at`) has been reached
    - No open `group_accounts` exists for that group
    - Group status is `'new'` or `'inprogress'`
  - Trigger `openAuction()` for matched groups

### 2.2 WebSocket Room Strategy
- **Current**: Using `group:${groupId}` as room ID ✅
- **Strategy**: 
  - Users join via `auction:join` event with `{ group_id, user_id }`
  - All group members automatically join `group:${groupId}` room
  - Notifications broadcast to `group:${groupId}` room

---

## Phase 3: WebSocket Notifications

### 3.1 Auction Opening Notification
- **Event**: `auction:opened`
- **Message**: `"Live Auction Open in the progress group"`
- **Recipients**: All users in `group:${groupId}` room
- **Payload**:
  ```json
  {
    "group_id": "uuid",
    "group_name": "Group Name",
    "group_account_id": "uuid",
    "message": "Live Auction Open in the progress group",
    "minimum_bid": 1000.00,
    "auction_start_at": "2024-01-15T10:00:00Z",
    "auction_end_at": "2024-01-15T12:00:00Z",
    "opened_at": "2024-01-15T10:00:00Z"
  }
  ```

### 3.2 5-Minute Warning Notification
- **Event**: `auction:warning`
- **Trigger**: When current time = `auction_end_at - 5 minutes`
- **Message**: `"Auction ending in 5 minutes"`
- **Recipients**: All users in `group:${groupId}` room
- **Payload**:
  ```json
  {
    "group_id": "uuid",
    "group_account_id": "uuid",
    "message": "Auction ending in 5 minutes",
    "time_left_minutes": 5,
    "auction_end_at": "2024-01-15T12:00:00Z"
  }
  ```

### 3.3 Auction Closing Notification
- **Event**: `auction:closed`
- **Trigger**: When current time >= `auction_end_at`
- **Message**: `"Auction closed"`
- **Recipients**: All users in `group:${groupId}` room
- **Payload**:
  ```json
  {
    "group_id": "uuid",
    "group_account_id": "uuid",
    "message": "Auction closed",
    "winner_share_id": "uuid",
    "winning_amount": 1500.00,
    "closed_at": "2024-01-15T12:00:00Z"
  }
  ```

---

## Phase 4: Auction Service Enhancements

### 4.1 Create Closing Method Structure
- **File**: `server/src/services/auctionClosingMethods.ts` (NEW)
- **Purpose**: Extensible closing methods for future expansion
- **Structure**:
  ```typescript
  export interface AuctionClosingMethod {
    close(groupId: string, io: SocketIOServer): Promise<void>;
  }
  
  export class CloseDeductiveMethod implements AuctionClosingMethod {
    async close(groupId: string, io: SocketIOServer): Promise<void> {
      // Implementation for deductive method
    }
  }
  ```

### 4.2 Update `openAuction` Function
- **File**: `server/src/services/auctionService.ts`
- **Changes**:
  - Check `next_auction_date` + `auction_start_at` combination
  - Create `group_accounts` record with status `'open'`
  - Emit WebSocket notification with message: `"Live Auction Open in the progress group"`
  - Ensure all group members receive notification

### 4.3 Update `closeAuction` Function
- **File**: `server/src/services/auctionService.ts`
- **Changes**:
  - Use `CloseDeductiveMethod` for closing
  - Find highest bidder from `auctions` table:
    - Query: `SELECT * FROM auctions WHERE group_account_id = ? ORDER BY amount DESC LIMIT 1`
    - If multiple bids with same highest amount, use the earliest one
  - Update `group_accounts`:
    - `status = 'closed'`
    - `auction_amount = winning_bid.amount`
    - `winner_share_id = winning_bid.group_usershare_id`
  - Calculate `next_auction_date`:
    - Use `calculateNextAuctionDate()` utility
    - Add monthly frequency (30 days) to current `next_auction_date`
  - Update `group.next_auction_date`
  - Emit WebSocket notification

### 4.4 Create `calculateNextAuctionDate` Utility
- **File**: `server/src/utils/auctionDateUtils.ts` (NEW)
- **Function**:
  ```typescript
  export function calculateNextAuctionDate(
    currentAuctionDate: Date, 
    frequency: 'weekly' | 'biweekly' | 'monthly' | null
  ): Date {
    const nextDate = new Date(currentAuctionDate);
    
    switch (frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1); // Proper month calculation
        break;
      default:
        // Default to monthly if frequency not specified
        nextDate.setMonth(nextDate.getMonth() + 1);
    }
    
    return nextDate;
  }
  ```

---

## Phase 5: Cron Job Updates

### 5.1 Auction Opening Check
- **File**: `server/src/cron/auctions.ts`
- **Schedule**: Every minute (`* * * * *`)
- **Logic**:
  1. Combine `next_auction_date` + time from `auction_start_at`
  2. Find groups where combined datetime <= now
  3. Check if auction already open (no open `group_accounts`)
  4. Call `openAuction()` for matched groups

### 5.2 5-Minute Warning Check
- **File**: `server/src/cron/auctions.ts`
- **Schedule**: Every minute (`* * * * *`)
- **Logic**:
  1. Find open auctions (`group_accounts.status = 'open'`)
  2. Check if `auction_end_at - 5 minutes <= now < auction_end_at`
  3. Send warning notification (only once per auction)
  4. Track sent warnings to avoid duplicates

### 5.3 Auction Closing Check
- **File**: `server/src/cron/auctions.ts`
- **Schedule**: Every minute (`* * * * *`)
- **Logic**:
  1. Find open auctions where `auction_end_at <= now`
  2. Call `closeAuction()` using `CloseDeductiveMethod`
  3. Ensure idempotency (don't close twice)

---

## Phase 6: Client-Side Updates

### 6.1 Update API References
- **Files to Update**:
  - `client/src/pages/Home.tsx`
  - `client/src/pages/GroupDetail.tsx`
  - `client/src/pages/CreateGroup.tsx`
  - `client/src/pages/GroupInviteView.tsx`
- **Changes**:
  - Replace `first_auction_date` → `next_auction_date`
  - Update all TypeScript interfaces
  - Update all API calls and form fields

### 6.2 Update Server Routes
- **File**: `server/src/routes/groups.ts`
- **Changes**:
  - Replace all `first_auction_date` references with `next_auction_date`
  - Update API endpoints:
    - GET `/groups`
    - GET `/groups/:id`
    - POST `/groups`
    - PUT `/groups/:id`
    - PUT `/groups/:id/auction`

### 6.3 WebSocket Client Integration
- **Files**: Client pages that need real-time updates
- **Implementation**:
  - Listen for `auction:opened` event
  - Listen for `auction:warning` event (5-minute warning)
  - Listen for `auction:closed` event
  - Display notifications/alerts to users
  - Update UI to show live auction status

---

## Phase 7: Testing & Validation

### 7.1 Test Cases
1. ✅ Auction opens when `next_auction_date` + `auction_start_at` reached
2. ✅ WebSocket notification sent to all group members
3. ✅ 5-minute warning sent at correct time
4. ✅ Auction closes at `auction_end_at`
5. ✅ Highest bidder correctly identified
6. ✅ `next_auction_date` calculated correctly (monthly = +1 month)
7. ✅ `group_accounts` updated with winner and status
8. ✅ No duplicate openings/closings (idempotency)
9. ✅ Client-side UI reflects `next_auction_date` correctly

### 7.2 Edge Cases
- No bids received → Close auction with no winner
- Multiple bids with same amount → Use earliest bid
- Group has no `auction_frequency` → Default to monthly
- `next_auction_date` is null → Handle gracefully
- WebSocket connection lost → Reconnect and rejoin rooms

---

## Implementation Order

1. **Database Migration** (Phase 1)
   - Rename column
   - Update model

2. **Server-Side Core Logic** (Phases 2, 4, 5)
   - Update cron job
   - Create closing methods
   - Update auction service
   - Create date utility

3. **WebSocket Notifications** (Phase 3)
   - Add notification events
   - Integrate with cron and service

4. **Client-Side Updates** (Phase 6)
   - Update API references
   - Update UI components
   - Add WebSocket listeners

5. **Testing** (Phase 7)
   - Test all scenarios
   - Fix edge cases

---

## Files to Create/Modify

### New Files:
- `server/src/scripts/renameFirstAuctionDateToNext.ts`
- `server/src/services/auctionClosingMethods.ts`
- `server/src/utils/auctionDateUtils.ts`

### Modified Files:
- `server/src/models/Group.ts`
- `server/src/cron/auctions.ts`
- `server/src/services/auctionService.ts`
- `server/src/routes/groups.ts`
- `client/src/pages/Home.tsx`
- `client/src/pages/GroupDetail.tsx`
- `client/src/pages/CreateGroup.tsx`
- `client/src/pages/GroupInviteView.tsx`

---

## Notes

- **Room ID**: Using `group:${groupId}` as room ID ✅
- **Closing Method**: Extensible structure with `CloseDeductiveMethod` for future expansion
- **Date Calculation**: Monthly frequency = +1 month (proper calendar month, not 30 days)
- **Notification Strategy**: Broadcast to all users in `group:${groupId}` room who have joined via `auction:join`
- **Idempotency**: Ensure auctions don't open/close multiple times

---

## Questions Answered

1. ✅ **Room ID**: Using `group:${groupId}` as room ID
2. ✅ **5-minute warning**: Implemented in cron job
3. ✅ **Best approach**: Using WebSocket rooms for group-based notifications
4. ✅ **Next auction date**: Calculated based on `next_auction_date` + monthly frequency
5. ✅ **Closing method**: Extensible structure with `CloseDeductiveMethod`





