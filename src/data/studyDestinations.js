export const studyDestinations = [
  { name: 'United Kingdom', shortName: 'UK', flagCode: 'gb' },
  { name: 'Canada', flagCode: 'ca' },
  { name: 'Australia', flagCode: 'au' },
  { name: 'Ireland', flagCode: 'ie' },
  { name: 'New Zealand', flagCode: 'nz' },
  { name: 'Sweden', flagCode: 'se' },
  { name: 'Germany', flagCode: 'de' },
  { name: 'France', flagCode: 'fr' },
  { name: 'Japan', flagCode: 'jp' },
  { name: 'United Arab Emirates', shortName: 'UAE', flagCode: 'ae' },
  { name: 'Malaysia', flagCode: 'my' },
  { name: 'Switzerland', flagCode: 'ch' },
  { name: 'Malta', flagCode: 'mt' },
  { name: 'Turkey', flagCode: 'tr' },
];

export const studyDestinationNames = studyDestinations.map((destination) => destination.name);

export const getDestinationLabel = (countryName) => {
  const destination = studyDestinations.find((item) => item.name === countryName);
  return destination?.shortName || countryName;
};

export const getDestinationFlagCode = (countryName) => {
  const destination = studyDestinations.find((item) => item.name === countryName);
  return destination?.flagCode || 'gb';
};
