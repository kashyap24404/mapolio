import {
    getAlabamaData, getAlaskaData, getArizonaData, getArkansasData, getCaliforniaData,
    getColoradoData, getConnecticutData, getDelawareData, getFloridaData, getGeorgiaData,
    getHawaiiData, getIdahoData, getIllinoisData, getIndianaData, getIowaData, getKansasData,
    getKentuckyData, getLouisianaData, getMaineData, getMarylandData, getMassachusettsData,
    getMichiganData, getMinnesotaData, getMississippiData, getMissouriData, getMontanaData,
    getNebraskaData, getNevadaData, getNewHampshireData, getNewJerseyData, getNewMexicoData,
    getNewYorkData, getNorthCarolinaData, getNorthDakotaData, getOhioData, getOklahomaData,
    getOregonData, getPennsylvaniaData, getRhodeIslandData, getSouthCarolinaData,
    getSouthDakotaData, getTennesseeData, getTexasData, getUtahData, getVermontData,
    getVirginiaData, getWashingtonData, getWestVirginiaData, getWisconsinData, getWyomingData,
    getAlabamaCityNames, getAlaskaCityNames, getArizonaCityNames, getArkansasCityNames, getCaliforniaCityNames,
    getColoradoCityNames, getConnecticutCityNames, getDelawareCityNames, getFloridaCityNames, getGeorgiaCityNames,
    getHawaiiCityNames, getIdahoCityNames, getIllinoisCityNames, getIndianaCityNames, getIowaCityNames, getKansasCityNames,
    getKentuckyCityNames, getLouisianaCityNames, getMaineCityNames, getMarylandCityNames, getMassachusettsCityNames,
    getMichiganCityNames, getMinnesotaCityNames, getMississippiCityNames, getMissouriCityNames, getMontanaCityNames,
    getNebraskaCityNames, getNevadaCityNames, getNewHampshireCityNames, getNewJerseyCityNames, getNewMexicoCityNames,
    getNewYorkCityNames, getNorthCarolinaCityNames, getNorthDakotaCityNames, getOhioCityNames, getOklahomaCityNames,
    getOregonCityNames, getPennsylvaniaCityNames, getRhodeIslandCityNames, getSouthCarolinaCityNames,
    getSouthDakotaCityNames, getTennesseeCityNames, getTexasCityNames, getUtahCityNames, getVermontCityNames,
    getVirginiaCityNames, getWashingtonCityNames, getWestVirginiaCityNames, getWisconsinCityNames, getWyomingCityNames,
    getAlabamaCountyNames, getAlaskaCountyNames, getArizonaCountyNames, getArkansasCountyNames, getCaliforniaCountyNames,
    getColoradoCountyNames, getConnecticutCountyNames, getDelawareCountyNames, getFloridaCountyNames, getGeorgiaCountyNames,
    getHawaiiCountyNames, getIdahoCountyNames, getIllinoisCountyNames, getIndianaCountyNames, getIowaCountyNames, getKansasCountyNames,
    getKentuckyCountyNames, getLouisianaCountyNames, getMaineCountyNames, getMarylandCountyNames, getMassachusettsCountyNames,
    getMichiganCountyNames, getMinnesotaCountyNames, getMississippiCountyNames, getMissouriCountyNames, getMontanaCountyNames,
    getNebraskaCountyNames, getNevadaCountyNames, getNewHampshireCountyNames, getNewJerseyCountyNames, getNewMexicoCountyNames,
    getNewYorkCountyNames, getNorthCarolinaCountyNames, getNorthDakotaCountyNames, getOhioCountyNames, getOklahomaCountyNames,
    getOregonCountyNames, getPennsylvaniaCountyNames, getRhodeIslandCountyNames, getSouthCarolinaCountyNames,
    getSouthDakotaCountyNames, getTennesseeCountyNames, getTexasCountyNames, getUtahCountyNames, getVermontCountyNames,
    getVirginiaCountyNames, getWashingtonCountyNames, getWestVirginiaCountyNames, getWisconsinCountyNames, getWyomingCountyNames
} from '../utils/locationDataManager.js'; 

export default {
    // NOTE: Category filtering feature - commented out for future use
    // This feature allows filtering of scraped results
    // Currently disabled but preserved for potential future implementation
    // useCategoryFilter: false,
    // allowedCategories: ['Discount store',
    //     'Supermarket',
    //     'Store',
    //     'Liquidator',
    //     'Thrift store',
    //     'General store'
    // ],

    processingOptions: {
        singleImage: true
    },

    scrapingInputs: {
        keywords: '',
        country: 'US',
        states: [],
        fields: ['title', 'address', 'phone', 'website', 'images', 'reviews'],
        rating: '0'
    },

    reviewExtraction: {
        maxReviews: 50
    },

    ratingFilter: {
        apply: false,
        value: '4.5+'
    },

    DEEP_SEARCH_CONFIG: {
        "alabama": { slug: "alabama", getDataFunction: getAlabamaData, getCityNamesFunction: getAlabamaCityNames, getCountyNamesFunction: getAlabamaCountyNames, displayName: "Alabama" },
        "alaska": { slug: "alaska", getDataFunction: getAlaskaData, getCityNamesFunction: getAlaskaCityNames, getCountyNamesFunction: getAlaskaCountyNames, displayName: "Alaska" },
        "arizona": { slug: "arizona", getDataFunction: getArizonaData, getCityNamesFunction: getArizonaCityNames, getCountyNamesFunction: getArizonaCountyNames, displayName: "Arizona" },
        "arkansas": { slug: "arkansas", getDataFunction: getArkansasData, getCityNamesFunction: getArkansasCityNames, getCountyNamesFunction: getArkansasCountyNames, displayName: "Arkansas" },
        "california": { slug: "california", getDataFunction: getCaliforniaData, getCityNamesFunction: getCaliforniaCityNames, getCountyNamesFunction: getCaliforniaCountyNames, displayName: "California" },
        "colorado": { slug: "colorado", getDataFunction: getColoradoData, getCityNamesFunction: getColoradoCityNames, getCountyNamesFunction: getColoradoCountyNames, displayName: "Colorado" },
        "connecticut": { slug: "connecticut", getDataFunction: getConnecticutData, getCityNamesFunction: getConnecticutCityNames, getCountyNamesFunction: getConnecticutCountyNames, displayName: "Connecticut" },
        "delaware": { slug: "delaware", getDataFunction: getDelawareData, getCityNamesFunction: getDelawareCityNames, getCountyNamesFunction: getDelawareCountyNames, displayName: "Delaware" },
        "florida": { slug: "florida", getDataFunction: getFloridaData, getCityNamesFunction: getFloridaCityNames, getCountyNamesFunction: getFloridaCountyNames, displayName: "Florida" },
        "georgia": { slug: "georgia", getDataFunction: getGeorgiaData, getCityNamesFunction: getGeorgiaCityNames, getCountyNamesFunction: getGeorgiaCountyNames, displayName: "Georgia" },
        "hawaii": { slug: "hawaii", getDataFunction: getHawaiiData, getCityNamesFunction: getHawaiiCityNames, getCountyNamesFunction: getHawaiiCountyNames, displayName: "Hawaii" },
        "idaho": { slug: "idaho", getDataFunction: getIdahoData, getCityNamesFunction: getIdahoCityNames, getCountyNamesFunction: getIdahoCountyNames, displayName: "Idaho" },
        "illinois": { slug: "illinois", getDataFunction: getIllinoisData, getCityNamesFunction: getIllinoisCityNames, getCountyNamesFunction: getIllinoisCountyNames, displayName: "Illinois" },
        "indiana": { slug: "indiana", getDataFunction: getIndianaData, getCityNamesFunction: getIndianaCityNames, getCountyNamesFunction: getIndianaCountyNames, displayName: "Indiana" },
        "iowa": { slug: "iowa", getDataFunction: getIowaData, getCityNamesFunction: getIowaCityNames, getCountyNamesFunction: getIowaCountyNames, displayName: "Iowa" },
        "kansas": { slug: "kansas", getDataFunction: getKansasData, getCityNamesFunction: getKansasCityNames, getCountyNamesFunction: getKansasCountyNames, displayName: "Kansas" },
        "kentucky": { slug: "kentucky", getDataFunction: getKentuckyData, getCityNamesFunction: getKentuckyCityNames, getCountyNamesFunction: getKentuckyCountyNames, displayName: "Kentucky" },
        "louisiana": { slug: "louisiana", getDataFunction: getLouisianaData, getCityNamesFunction: getLouisianaCityNames, getCountyNamesFunction: getLouisianaCountyNames, displayName: "Louisiana" },
        "maine": { slug: "maine", getDataFunction: getMaineData, getCityNamesFunction: getMaineCityNames, getCountyNamesFunction: getMaineCountyNames, displayName: "Maine" },
        "maryland": { slug: "maryland", getDataFunction: getMarylandData, getCityNamesFunction: getMarylandCityNames, getCountyNamesFunction: getMarylandCountyNames, displayName: "Maryland" },
        "massachusetts": { slug: "massachusetts", getDataFunction: getMassachusettsData, getCityNamesFunction: getMassachusettsCityNames, getCountyNamesFunction: getMassachusettsCountyNames, displayName: "Massachusetts" },
        "michigan": { slug: "michigan", getDataFunction: getMichiganData, getCityNamesFunction: getMichiganCityNames, getCountyNamesFunction: getMichiganCountyNames, displayName: "Michigan" },
        "minnesota": { slug: "minnesota", getDataFunction: getMinnesotaData, getCityNamesFunction: getMinnesotaCityNames, getCountyNamesFunction: getMinnesotaCountyNames, displayName: "Minnesota" },
        "mississippi": { slug: "mississippi", getDataFunction: getMississippiData, getCityNamesFunction: getMississippiCityNames, getCountyNamesFunction: getMississippiCountyNames, displayName: "Mississippi" },
        "missouri": { slug: "missouri", getDataFunction: getMissouriData, getCityNamesFunction: getMissouriCityNames, getCountyNamesFunction: getMissouriCountyNames, displayName: "Missouri" },
        "montana": { slug: "montana", getDataFunction: getMontanaData, getCityNamesFunction: getMontanaCityNames, getCountyNamesFunction: getMontanaCountyNames, displayName: "Montana" },
        "nebraska": { slug: "nebraska", getDataFunction: getNebraskaData, getCityNamesFunction: getNebraskaCityNames, getCountyNamesFunction: getNebraskaCountyNames, displayName: "Nebraska" },
        "nevada": { slug: "nevada", getDataFunction: getNevadaData, getCityNamesFunction: getNevadaCityNames, getCountyNamesFunction: getNevadaCountyNames, displayName: "Nevada" },
        "new hampshire": { slug: "new hampshire", getDataFunction: getNewHampshireData, getCityNamesFunction: getNewHampshireCityNames, getCountyNamesFunction: getNewHampshireCountyNames, displayName: "New Hampshire" },
        "new jersey": { slug: "new jersey", getDataFunction: getNewJerseyData, getCityNamesFunction: getNewJerseyCityNames, getCountyNamesFunction: getNewJerseyCountyNames, displayName: "New Jersey" },
        "new mexico": { slug: "new mexico", getDataFunction: getNewMexicoData, getCityNamesFunction: getNewMexicoCityNames, getCountyNamesFunction: getNewMexicoCountyNames, displayName: "New Mexico" },
        "new york": { slug: "new york", getDataFunction: getNewYorkData, getCityNamesFunction: getNewYorkCityNames, getCountyNamesFunction: getNewYorkCountyNames, displayName: "New York" },
        "north carolina": { slug: "north carolina", getDataFunction: getNorthCarolinaData, getCityNamesFunction: getNorthCarolinaCityNames, getCountyNamesFunction: getNorthCarolinaCountyNames, displayName: "North Carolina" },
        "north dakota": { slug: "north dakota", getDataFunction: getNorthDakotaData, getCityNamesFunction: getNorthDakotaCityNames, getCountyNamesFunction: getNorthDakotaCountyNames, displayName: "North Dakota" },
        "ohio": { slug: "ohio", getDataFunction: getOhioData, getCityNamesFunction: getOhioCityNames, getCountyNamesFunction: getOhioCountyNames, displayName: "Ohio" },
        "oklahoma": { slug: "oklahoma", getDataFunction: getOklahomaData, getCityNamesFunction: getOklahomaCityNames, getCountyNamesFunction: getOklahomaCountyNames, displayName: "Oklahoma" },
        "oregon": { slug: "oregon", getDataFunction: getOregonData, getCityNamesFunction: getOregonCityNames, getCountyNamesFunction: getOregonCountyNames, displayName: "Oregon" },
        "pennsylvania": { slug: "pennsylvania", getDataFunction: getPennsylvaniaData, getCityNamesFunction: getPennsylvaniaCityNames, getCountyNamesFunction: getPennsylvaniaCountyNames, displayName: "Pennsylvania" },
        "rhode island": { slug: "rhode island", getDataFunction: getRhodeIslandData, getCityNamesFunction: getRhodeIslandCityNames, getCountyNamesFunction: getRhodeIslandCountyNames, displayName: "Rhode Island" },
        "south carolina": { slug: "south carolina", getDataFunction: getSouthCarolinaData, getCityNamesFunction: getSouthCarolinaCityNames, getCountyNamesFunction: getSouthCarolinaCountyNames, displayName: "South Carolina" },
        "south dakota": { slug: "south dakota", getDataFunction: getSouthDakotaData, getCityNamesFunction: getSouthDakotaCityNames, getCountyNamesFunction: getSouthDakotaCountyNames, displayName: "South Dakota" },
        "tennessee": { slug: "tennessee", getDataFunction: getTennesseeData, getCityNamesFunction: getTennesseeCityNames, getCountyNamesFunction: getTennesseeCountyNames, displayName: "Tennessee" },
        "texas": { slug: "texas", getDataFunction: getTexasData, getCityNamesFunction: getTexasCityNames, getCountyNamesFunction: getTexasCountyNames, displayName: "Texas" },
        "utah": { slug: "utah", getDataFunction: getUtahData, getCityNamesFunction: getUtahCityNames, getCountyNamesFunction: getUtahCountyNames, displayName: "Utah" },
        "vermont": { slug: "vermont", getDataFunction: getVermontData, getCityNamesFunction: getVermontCityNames, getCountyNamesFunction: getVermontCountyNames, displayName: "Vermont" },
        "virginia": { slug: "virginia", getDataFunction: getVirginiaData, getCityNamesFunction: getVirginiaCityNames, getCountyNamesFunction: getVirginiaCountyNames, displayName: "Virginia" },
        "washington": { slug: "washington", getDataFunction: getWashingtonData, getCityNamesFunction: getWashingtonCityNames, getCountyNamesFunction: getWashingtonCountyNames, displayName: "Washington" },
        "west virginia": { slug: "west virginia", getDataFunction: getWestVirginiaData, getCityNamesFunction: getWestVirginiaCityNames, getCountyNamesFunction: getWestVirginiaCountyNames, displayName: "West Virginia" },
        "wisconsin": { slug: "wisconsin", getDataFunction: getWisconsinData, getCityNamesFunction: getWisconsinCityNames, getCountyNamesFunction: getWisconsinCountyNames, displayName: "Wisconsin" },
        "wyoming": { slug: "wyoming", getDataFunction: getWyomingData, getCityNamesFunction: getWyomingCityNames, getCountyNamesFunction: getWyomingCountyNames, displayName: "Wyoming" }
    },

    STATE_ABBREVIATIONS: {
        'alabama': 'al', 'alaska': 'ak', 'arizona': 'az', 'arkansas': 'ar', 'california': 'ca',
        'colorado': 'co', 'connecticut': 'ct', 'delaware': 'de', 'florida': 'fl', 'georgia': 'ga',
        'hawaii': 'hi', 'idaho': 'id', 'illinois': 'il', 'indiana': 'in', 'iowa': 'ia', 'kansas': 'ks',
        'kentucky': 'ky', 'louisiana': 'la', 'maine': 'me', 'maryland': 'md', 'massachusetts': 'ma',
        'michigan': 'mi', 'minnesota': 'mn', 'mississippi': 'ms', 'missouri': 'mo', 'montana': 'mt',
        'nebraska': 'ne', 'nevada': 'nv', 'new-hampshire': 'nh', 'new-jersey': 'nj', 'new-mexico': 'nm',
        'new-york': 'ny', 'north-carolina': 'nc', 'north-dakota': 'nd', 'ohio': 'oh', 'oklahoma': 'ok',
        'oregon': 'or', 'pennsylvania': 'pa', 'rhode-island': 'ri', 'south-carolina': 'sc', 'south-dakota': 'sd',
        'tennessee': 'tn', 'texas': 'tx', 'utah': 'ut', 'vermont': 'vt', 'virginia': 'va', 'washington': 'wa',
        'west-virginia': 'wv', 'wisconsin': 'wi', 'wyoming': 'wy'
    }
};
