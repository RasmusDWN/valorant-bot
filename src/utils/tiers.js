const tierNames = {
    "12683d76-48d7-84a3-4e09-6985794f0445": "Select",
    "0cebb8be-46d7-c12a-d306-e9907bfc5a25": "Deluxe",
    "60bca009-4182-7998-dee7-b8a2558dc369": "Premium",
    "e046854e-406c-37f4-6607-19a9ba8426fc": "Exclusive",
    "411e4a55-4e59-7757-41f0-86a53f101bb5": "Ultra"
};

const tierEmotes = {
    "Select": "<:SelectTier:IDHERE>",
    "Deluxe": "<:DeluxeTier:IDHERE>",
    "Premium": "<:PremiumTier:IDHERE>",
    "Exclusive": "<:ExclusiveTier:IDHERE>",
    "Ultra": "<:UltraTier:IDHERE>"
};

// Fetches names of skin tiers based on their UUIDs.
export function getTierName(uuid) {
    const name = tierNames[uuid] || 'Unknown';
    const emote = name !== 'Unknown' ? (tierEmotes[name] || '') : '';

    return `${name} ${emote}`.trim();
}
