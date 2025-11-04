import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Language = 'en' | 'ta' | 'ml' | 'kn' | 'hi'

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
    language: 'en',
    setLanguage: () => {},
    t: (key: string) => key
})

// Translations
const translations: Record<Language, Record<string, string>> = {
    en: {
        // Header
        'login': 'Login',
        'signup': 'Sign up',
        'logout': 'Logout',
        'admin': 'Admin',
        
        // Home page
        'welcome': 'Welcome',
        'myGroups': 'My groups',
        'allGroups': 'All groups',
        'inProgressGroups': 'In‑progress groups',
        'newGroups': 'New groups',
        'closedGroups': 'Closed groups',
        'noGroupsFound': 'No groups found.',
        'createFirstGroup': 'Create Your First Group',
        'loadingGroups': 'Loading groups...',
        'createdByMe': 'Created by me',
        'joined': 'Joined',
        'new': 'New',
        'inProgress': 'In Progress',
        'closed': 'Closed',
        'created': 'Created',
        'amount': 'Amount',
        'members': 'Members',
        'firstAuction': 'First Auction',
        'addMember': 'Add',
        'member': 'member',
        'manageFeatures': 'Manage Features',
        'delete': 'Delete',
        
        // Common
        'smartPools': 'Smart, trusted money pools with friends and community',
        'getStarted': 'Get started',
        'alreadyHaveAccount': 'I already have an account',
    },
    ta: {
        // Header
        'login': 'உள்நுழை',
        'signup': 'பதிவு செய்',
        'logout': 'வெளியேறு',
        'admin': 'நிர்வாகம்',
        
        // Home page
        'welcome': 'வரவேற்பு',
        'myGroups': 'எனது குழுக்கள்',
        'allGroups': 'அனைத்து குழுக்கள்',
        'inProgressGroups': 'நடைபெறும் குழுக்கள்',
        'newGroups': 'புதிய குழுக்கள்',
        'closedGroups': 'மூடப்பட்ட குழுக்கள்',
        'noGroupsFound': 'குழுக்கள் எதுவும் கிடைக்கவில்லை.',
        'createFirstGroup': 'உங்கள் முதல் குழுவை உருவாக்கவும்',
        'loadingGroups': 'குழுக்கள் ஏற்றப்படுகின்றன...',
        'createdByMe': 'நான் உருவாக்கியது',
        'joined': 'சேர்ந்தது',
        'new': 'புதியது',
        'inProgress': 'நடைபெறுகிறது',
        'closed': 'மூடப்பட்டது',
        'created': 'உருவாக்கப்பட்டது',
        'amount': 'தொகை',
        'members': 'உறுப்பினர்கள்',
        'firstAuction': 'முதல் ஏலம்',
        'addMember': 'சேர்',
        'member': 'உறுப்பினர்',
        'manageFeatures': 'அம்சங்களை நிர்வகி',
        'delete': 'நீக்கு',
        
        // Common
        'smartPools': 'நண்பர்கள் மற்றும் சமூகத்துடன் புத்திசாலி, நம்பகமான பண குழுக்கள்',
        'getStarted': 'தொடங்கவும்',
        'alreadyHaveAccount': 'எனக்கு ஏற்கனவே கணக்கு உள்ளது',
    },
    ml: {
        // Header
        'login': 'ലോഗിൻ',
        'signup': 'സൈൻ അപ്പ്',
        'logout': 'ലോഗൗട്ട്',
        'admin': 'അഡ്മിൻ',
        
        // Home page
        'welcome': 'സ്വാഗതം',
        'myGroups': 'എന്റെ ഗ്രൂപ്പുകൾ',
        'allGroups': 'എല്ലാ ഗ്രൂപ്പുകളും',
        'inProgressGroups': 'പുരോഗതിയിലുള്ള ഗ്രൂപ്പുകൾ',
        'newGroups': 'പുതിയ ഗ്രൂപ്പുകൾ',
        'closedGroups': 'അടച്ച ഗ്രൂപ്പുകൾ',
        'noGroupsFound': 'ഗ്രൂപ്പുകൾ കണ്ടെത്തിയില്ല.',
        'createFirstGroup': 'നിങ്ങളുടെ ആദ്യ ഗ്രൂപ്പ് സൃഷ്ടിക്കുക',
        'loadingGroups': 'ഗ്രൂപ്പുകൾ ലോഡ് ചെയ്യുന്നു...',
        'createdByMe': 'ഞാൻ സൃഷ്ടിച്ചത്',
        'joined': 'ചേർന്നു',
        'new': 'പുതിയത്',
        'inProgress': 'പുരോഗതിയിലുണ്ട്',
        'closed': 'അടച്ചു',
        'created': 'സൃഷ്ടിച്ചത്',
        'amount': 'തുക',
        'members': 'അംഗങ്ങൾ',
        'firstAuction': 'ആദ്യ ഏലം',
        'addMember': 'ചേർക്കുക',
        'member': 'അംഗം',
        'manageFeatures': 'സവിശേഷതകൾ നിയന്ത്രിക്കുക',
        'delete': 'ഇല്ലാതാക്കുക',
        
        // Common
        'smartPools': 'സുഹൃത്തുക്കളും കമ്മ്യൂണിറ്റിയും ഉപയോഗിച്ചുള്ള ബുദ്ധിമാനും വിശ്വസനീയവുമായ പണ ഗ്രൂപ്പുകൾ',
        'getStarted': 'ആരംഭിക്കുക',
        'alreadyHaveAccount': 'എനിക്ക് ഇതിനകം അക്കൗണ്ട് ഉണ്ട്',
    },
    kn: {
        // Header
        'login': 'ಲಾಗಿನ್',
        'signup': 'ಸೈನ್ ಅಪ್',
        'logout': 'ಲಾಗ್ ಔಟ್',
        'admin': 'ನಿರ್ವಾಹಕ',
        
        // Home page
        'welcome': 'ಸ್ವಾಗತ',
        'myGroups': 'ನನ್ನ ಗುಂಪುಗಳು',
        'allGroups': 'ಎಲ್ಲಾ ಗುಂಪುಗಳು',
        'inProgressGroups': 'ಪ್ರಗತಿಯಲ್ಲಿರುವ ಗುಂಪುಗಳು',
        'newGroups': 'ಹೊಸ ಗುಂಪುಗಳು',
        'closedGroups': 'ಮುಚ್ಚಿದ ಗುಂಪುಗಳು',
        'noGroupsFound': 'ಗುಂಪುಗಳು ಕಂಡುಬಂದಿಲ್ಲ.',
        'createFirstGroup': 'ನಿಮ್ಮ ಮೊದಲ ಗುಂಪನ್ನು ರಚಿಸಿ',
        'loadingGroups': 'ಗುಂಪುಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...',
        'createdByMe': 'ನಾನು ರಚಿಸಿದ್ದು',
        'joined': 'ಸೇರಿದೆ',
        'new': 'ಹೊಸ',
        'inProgress': 'ಪ್ರಗತಿಯಲ್ಲಿದೆ',
        'closed': 'ಮುಚ್ಚಿದ',
        'created': 'ರಚಿಸಲಾಗಿದೆ',
        'amount': 'ಮೊತ್ತ',
        'members': 'ಸದಸ್ಯರು',
        'firstAuction': 'ಮೊದಲ ಲೇಲಾಂಗಣ',
        'addMember': 'ಸೇರಿಸಿ',
        'member': 'ಸದಸ್ಯ',
        'manageFeatures': 'ವೈಶಿಷ್ಟ್ಯಗಳನ್ನು ನಿರ್ವಹಿಸಿ',
        'delete': 'ಅಳಿಸಿ',
        
        // Common
        'smartPools': 'ಸ್ನೇಹಿತರು ಮತ್ತು ಸಮುದಾಯದೊಂದಿಗೆ ಸ್ಮಾರ್ಟ್, ವಿಶ್ವಾಸಾರ್ಹ ಹಣದ ಗುಂಪುಗಳು',
        'getStarted': 'ಪ್ರಾರಂಭಿಸಿ',
        'alreadyHaveAccount': 'ನನಗೆ ಈಗಾಗಲೇ ಖಾತೆ ಇದೆ',
    },
    hi: {
        // Header
        'login': 'लॉगिन',
        'signup': 'साइन अप',
        'logout': 'लॉगआउट',
        'admin': 'व्यवस्थापक',
        
        // Home page
        'welcome': 'स्वागत है',
        'myGroups': 'मेरे समूह',
        'allGroups': 'सभी समूह',
        'inProgressGroups': 'प्रगति में समूह',
        'newGroups': 'नए समूह',
        'closedGroups': 'बंद समूह',
        'noGroupsFound': 'कोई समूह नहीं मिला।',
        'createFirstGroup': 'अपना पहला समूह बनाएं',
        'loadingGroups': 'समूह लोड हो रहे हैं...',
        'createdByMe': 'मेरे द्वारा बनाया गया',
        'joined': 'शामिल',
        'new': 'नया',
        'inProgress': 'प्रगति में',
        'closed': 'बंद',
        'created': 'बनाया गया',
        'amount': 'राशि',
        'members': 'सदस्य',
        'firstAuction': 'पहली नीलामी',
        'addMember': 'जोड़ें',
        'member': 'सदस्य',
        'manageFeatures': 'सुविधाएं प्रबंधित करें',
        'delete': 'हटाएं',
        
        // Common
        'smartPools': 'दोस्तों और समुदाय के साथ स्मार्ट, विश्वसनीय पैसे के पूल',
        'getStarted': 'शुरू करें',
        'alreadyHaveAccount': 'मेरे पास पहले से ही खाता है',
    }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>(() => {
        // Load from localStorage or default to English
        const saved = localStorage.getItem('language') as Language
        return saved && ['en', 'ta', 'ml', 'kn', 'hi'].includes(saved) ? saved : 'en'
    })

    useEffect(() => {
        localStorage.setItem('language', language)
    }, [language])

    const setLanguage = (lang: Language) => {
        setLanguageState(lang)
    }

    const t = (key: string): string => {
        return translations[language][key] || translations['en'][key] || key
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    return useContext(LanguageContext)
}

