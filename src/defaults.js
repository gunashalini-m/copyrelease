export const defaultSettings = {
  invoicePrefix: 'INTSINV',
  nextSequence: 99,
  sequencePadding: 3,
  company: {
    name: 'Introis Technologies',
    address: 'No: 715-A, 7th floor, Spencer Plaza,\nAnna Salai, Chennai',
    phone: '+91 95263 02196',
    email: 'inquire@introis.com',
    gstin: '33IJNPK4521A1ZI',
  },
  signatory: {
    name: 'Nabeesh R',
    designation: 'Chief Executive Officer',
  },
  banks: {
    current: {
      accountType: 'Current',
      bankName: 'HDFC Bank',
      holderName: 'Introis Technologies',
      accountNumber: '50200076255606',
      ifsc: 'HDFC0000795',
      branch: 'Perungudi',
    },
    savings: {
      accountType: 'Savings',
      bankName: 'HDFC Bank',
      holderName: 'Introis Technologies',
      accountNumber: '',
      ifsc: 'HDFC0000795',
      branch: 'Perungudi',
    },
  },
  terms: [
    'Additional features apart from the points discussed using the documentation will be exclusively charged',
    'Project work will be done only during the business days (Monday to Friday)',
    'All communication will be intimated through emails as well as messages or calls',
  ],
};

export const defaultClients = [
  {
    id: 'client-pukra',
    contactName: 'Karthic Rajendran',
    companyName: 'Kovai Heart Foundation (P) LTD',
    address: 'Pukra Super Speciality Hospital,\n9, L&T Bypass, Irugur, Coimbatore,\nTamil Nadu - 641103',
    email: 'vrk0905@gmail.com',
    gstin: '33AADCK8917A1ZU',
  },
];
