import fetch from 'node-fetch';

// Fetches a reward by its UUID and type. So if type is "Spray" and uuid is a spray UUID,
// it fetches that spray from https://valorant-api.com/v1/sprays.
export async function fetchReward(type, uuid) {
    if (!type || !uuid) return { name: 'Unknown', image : null };

    let endpoint = '';
    switch (type.toLowerCase()) {
        case 'currency':
            endpoint = `https://valorant-api.com/v1/currencies/${uuid}`;
            break;
        case 'equippablecharmlevel':
            endpoint = `https://valorant-api.com/v1/buddies/${uuid}`;
            break;
        case 'equippableskinlevel':
            endpoint = `https://valorant-api.com/v1/weapons/skins/${uuid}`;
            break;
        case 'playercard':
            endpoint = `https://valorant-api.com/v1/playercards/${uuid}`;
            break;
        case 'spray':
            endpoint = `https://valorant-api.com/v1/sprays/${uuid}`;
            break;
        case 'title':
            endpoint = `https://valorant-api.com/v1/playertitles/${uuid}`;
            break;
        case 'totem':
            // Note: Valorant API does not have a totems endpoint as of now.
            return { name: 'Totem', image: null };
        default:
            return { name: 'Unknown', image: null };
    }

    try {
        const response = await fetch(endpoint);
        const data = await response.json();

        if (!data?.data) return { name: 'Unknown', image: null };

        let name = data.data.displayName || 'Unknown';
        let image = null;

        // Pick the appropriate image based on type
        switch(type.toLowerCase()) {
            case 'currency':
                image = data.data.displayIcon || null;
                break;
            case 'equippablecharmlevel':
                image = data.data.displayIcon || null;
                break;
            case 'equippableskinlevel':
                image = data.data.displayIcon || null;
                break;
            case 'playercard':
                image = data.data.largeArt || data.data.displayIcon || null;
                break;
            case 'spray':
                image = data.data.fullTransparentIcon || data.data.displayIcon || null;
                break;
            case 'title':
                image = null;
                break;
            case 'totem':
                image = null;
                break;
        }

        return { name, image };
    } catch (error) {
        console.error(`Error fetching reward: ${error}`);
        return { name: 'Unknown', image: null };
    }
}