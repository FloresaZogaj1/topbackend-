const axios = require('axios');
(async () => {
  const api = axios.create({ baseURL: 'http://localhost:4000/api', timeout: 10000 });
  const form = {
    emri: 'floresa',
    mbiemri: 'zogaj',
    telefoni: '045407222',
    email: 'floresa@example.com',
    marka: 'Apple',
    modeli: 'iPhone 13 Pro Max',
    pajisja: 'iPadOS 16 - 2022',
    imei: '12345678912345',
    softInfo: 'iOS 16',
    kohezgjatja: '12 muaj',
    cmimi: '99.99',
    data: '2025-11-13',
    komente: 'test',
    llojiPageses: 'Cash'
  };

  try {
    console.log('POST /warranty/from-form ->', form);
    const r1 = await api.post('/warranty/from-form', form);
    console.log('/warranty/from-form resp status:', r1.status);
    console.log('/warranty/from-form resp data:', r1.data);
  } catch (e) {
    if (e.response) {
      console.error('Warranty POST ERROR', e.response.status, e.response.data);
    } else {
      console.error('Warranty POST ERROR', e.message);
    }
  }

  try {
    const contractPayload = {
      emri: form.emri,
      mbiemri: form.mbiemri,
      telefoni: form.telefoni,
      email: form.email,
      marka: form.marka,
      modeli: form.modeli,
      pajisja: form.pajisja,
      imei: form.imei,
      cmimi: form.cmimi,
      llojiPageses: form.llojiPageses,
      data: form.data,
      komente: form.komente,
    };
    console.log('POST /contracts/softsave ->', contractPayload);
    const r2 = await api.post('/contracts/softsave', contractPayload);
    console.log('/contracts/softsave resp status:', r2.status);
    console.log('/contracts/softsave resp data:', r2.data);
  } catch (e) {
    if (e.response) {
      console.error('Contract POST ERROR', e.response.status, e.response.data);
    } else {
      console.error('Contract POST ERROR', e.message);
    }
  }
})();
