// ============================================
// QUICK TEST SCRIPT - Copy this to Browser Console
// ============================================

(async function() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('❌ No token found. Please login first!');
    return;
  }
  
  console.log('🚀 Starting test setup...');
  
  // Step 1: Get your groups
  console.log('📋 Fetching your groups...');
  const groupsRes = await fetch('http://localhost:4000/groups', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!groupsRes.ok) {
    console.error('❌ Failed to fetch groups:', await groupsRes.text());
    return;
  }
  
  const groups = await groupsRes.json();
  console.log('📋 Found', groups.length, 'groups:', groups.map(g => ({ id: g.id, name: g.name })));
  
  if (groups.length === 0) {
    console.error('❌ No groups found. Please create a group first!');
    return;
  }
  
  // Use first group
  const group = groups[0];
  console.log('🎯 Using group:', group.name, '(ID:', group.id + ')');
  
  // Step 2: Set auction times to open NOW
  const now = new Date();
  const startTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago (so it opens)
  const endTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now (so it closes later)
  
  console.log('⏰ Setting auction times:');
  console.log('   Next Auction Date:', now.toISOString().split('T')[0]);
  console.log('   Start Time:', startTime.toISOString());
  console.log('   End Time:', endTime.toISOString());
  
  const updateRes = await fetch(`http://localhost:4000/groups/${group.id}/auction`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      next_auction_date: now.toISOString().split('T')[0], // Today's date (YYYY-MM-DD)
      auction_start_at: startTime.toISOString(),
      auction_end_at: endTime.toISOString()
    })
  });
  
  if (!updateRes.ok) {
    const error = await updateRes.json();
    console.error('❌ Failed to update group:', error);
    if (error.message?.includes('Only the group creator')) {
      console.error('💡 Tip: You must be the creator of the group to update auction times.');
    }
    return;
  }
  
  const updated = await updateRes.json();
  console.log('✅ Group updated successfully!', updated.group);
  
  // Step 3: Trigger cron job
  console.log('\n⏰ Triggering cron job...');
  const cronRes = await fetch('http://localhost:4000/admin/test-auction-cron', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const cronResult = await cronRes.json();
  console.log('✅ Cron job result:', cronResult);
  
  if (cronResult.results.opened_auctions > 0) {
    console.log('\n🎉 SUCCESS! Auction opened!');
    console.log('📢 Check your browser console for WebSocket events:');
    console.log('   - Look for: 🎯 Auction opened event received');
    console.log('   - Participation modal should appear on screen');
  } else {
    console.log('\n⚠️ No auctions opened. Possible reasons:');
    console.log('   1. Group has no members with accepted/active shares');
    console.log('   2. Group status is not "new" or "inprogress"');
    console.log('   3. Auction already exists (check if auction is already open)');
    
    // Check if auction already exists
    const auctionRes = await fetch(`http://localhost:4000/groups/${group.id}/auction`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (auctionRes.ok) {
      const auction = await auctionRes.json();
      if (auction.status === 'open') {
        console.log('   ℹ️ Auction is already open! Check browser for notifications.');
      }
    }
  }
  
  console.log('\n✅ Test setup complete!');
})();


