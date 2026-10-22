from __future__ import annotations

_STRINGS: dict[str, dict[str, str]] = {
    "welcome_user": {
        "en": "Welcome! Use the menu below to register for a job or check your status.",
        "am": "እንኳን ደህና መጡ! ከታች ባለው ምናሌ ስራ ለመመዝገብ ወይም ሁኔታዎን ለማየት ይጠቀሙ።",
    },
    "welcome_admin": {
        "en": "Welcome back, {name}. You're signed in as {role}.",
        "am": "እንኳን ደህና መጡ፣ {name}። እንደ {role} ገብተዋል።",
    },
    "account_inactive": {
        "en": "Your administrator account has been deactivated. Contact a Super Admin.",
        "am": "የአስተዳዳሪ መለያዎ ተሰናክሏል። እባክዎ ሱፐር አድሚን ያግኙ።",
    },
    "menu_register": {"en": "📝 Register", "am": "📝 ይመዝገቡ"},
    "menu_profile": {"en": "👤 My Profile", "am": "👤 መገለጫዬ"},
    "menu_registration": {"en": "📋 My Registration", "am": "📋 ምዝገባዬ"},
    "menu_notifications": {"en": "🔔 Notifications", "am": "🔔 ማሳወቂያዎች"},
    "menu_language": {"en": "🌐 Language", "am": "🌐 ቋንቋ"},
    "menu_help": {"en": "ℹ️ Help", "am": "ℹ️ እገዛ"},
    "menu_dashboard": {"en": "📊 Dashboard", "am": "📊 ዳሽቦርድ"},
    "menu_registrations": {"en": "📋 Registrations", "am": "📋 ምዝገባዎች"},
    "menu_users": {"en": "👥 Users", "am": "👥 ተጠቃሚዎች"},
    "menu_jobs": {"en": "💼 Jobs", "am": "💼 ስራዎች"},
    "menu_locations": {"en": "📍 Locations", "am": "📍 አካባቢዎች"},
    "menu_reports": {"en": "📈 Reports", "am": "📈 ሪፖርቶች"},
    "menu_activity_logs": {"en": "📝 Activity Logs", "am": "📝 የእንቅስቃሴ መዝገቦች"},
    "menu_admin_management": {"en": "👨‍💼 Admin Management", "am": "👨‍💼 የአስተዳዳሪ አስተዳደር"},
    "help_user": {
        "en": (
            "Register: submit a job application.\n"
            "My Profile: view your saved details.\n"
            "My Registration: check the status of your applications.\n"
            "Notifications: see messages from administrators.\n"
            "Language: switch between English and Amharic."
        ),
        "am": (
            "ይመዝገቡ፦ የስራ ማመልከቻ ያስገቡ።\n"
            "መገለጫዬ፦ የተቀመጡ ዝርዝሮችዎን ይመልከቱ።\n"
            "ምዝገባዬ፦ የማመልከቻዎችዎን ሁኔታ ይመልከቱ።\n"
            "ማሳወቂያዎች፦ ከአስተዳዳሪዎች የተላኩ መልዕክቶችን ይመልከቱ።\n"
            "ቋንቋ፦ በእንግሊዝኛ እና በአማርኛ መካከል ይቀያይሩ።"
        ),
    },
    "help_admin": {
        "en": "Use the menu below to open the Admin dashboard for the section you need.",
        "am": "ከታች ባለው ምናሌ ውስጥ የሚፈልጉትን ክፍል ለመክፈት ይጠቀሙ።",
    },
    "choose_language": {"en": "Choose your language:", "am": "ቋንቋዎን ይምረጡ፦"},
    "language_set": {"en": "Language set to English.", "am": "ቋንቋ ወደ አማርኛ ተቀናብሯል።"},
    "open_mini_app": {"en": "Open", "am": "ክፈት"},
}


def t(key: str, lang: str = "en", **kwargs) -> str:
    entry = _STRINGS.get(key, {})
    template = entry.get(lang) or entry.get("en") or key
    return template.format(**kwargs) if kwargs else template
