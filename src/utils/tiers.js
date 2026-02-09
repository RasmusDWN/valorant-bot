const tierNames = {
    "12683d76-48d7-84a3-4e09-6985794f0445": "Select",
    "0cebb8be-46d7-c12a-d306-e9907bfc5a25": "Deluxe",
    "60bca009-4182-7998-dee7-b8a2558dc369": "Premium",
    "e046854e-406c-37f4-6607-19a9ba8426fc": "Exclusive",
    "411e4a55-4e59-7757-41f0-86a53f101bb5": "Ultra"
};

const tierPrices = {
    "Select" : "875 VP",
    "Deluxe" : "1275 VP",
    "Premium" : "1775 VP",
    "Exclusive" : "Varies",
    "Ultra" : "Varies"
};

const tierEmotes = {
    "Select": "<:select:1464237592022351932>",
    "Deluxe": "<:deluxe:1464237687543435297>",
    "Premium": "<:premium:1464237631079583858>",
    "Exclusive": "<:exclusive:1464237651484737566>",
    "Ultra": "<:ultra:1464237480461991988>"
};

// Fetches names of skin tiers based on their UUIDs.
export function getTier(uuid) {
    const name = tierNames[uuid] || 'Unknown';
    const emote = name !== 'Unknown' ? (tierEmotes[name] || '') : '';

    return `${name} ${emote}`.trim();
}

export function getTierName(uuid) {
    return tierNames[uuid] || 'Unknown';
}

export function getTierPrice(uuid) {
    const name = tierNames[uuid];
    return name ? tierPrices[name] : 'Unknown';
}
