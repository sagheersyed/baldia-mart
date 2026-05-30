async function seed() {
  try {
    // 1. Create Clinics first (to ensure they exist)
    const clinicsToCreate = [
      { name: "City Hospital", address: "Main Blvd, Gulberg III, Lahore", type: "Hospital" },
      { name: "Gulberg Clinic", address: "Street 5, Gulberg II, Lahore", type: "Clinic" },
      { name: "Video Consultation", address: "Online", type: "Video Room" }
    ];

    for (const c of clinicsToCreate) {
      await fetch('http://127.0.0.1:3000/api/v1/pharma/telemedicine/admin/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c)
      });
    }

    // 2. Create Doctor
    const doctorRes = await fetch('http://127.0.0.1:3000/api/v1/pharma/telemedicine/doctors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: "Ahmed Khan",
        specialization: "General Physician",
        experienceYears: 10,
        consultationFee: 1500,
        biography: "Dr. Ahmed Khan is a senior general physician with over 10 years of experience in managing acute and chronic illnesses."
      })
    });
    const doctor = await doctorRes.json();
    console.log('Created doctor:', doctor.id);

    // 3. Fetch Clinics
    const clinicsRes = await fetch('http://127.0.0.1:3000/api/v1/pharma/telemedicine/clinics');
    const clinics = await clinicsRes.json();
    console.log('Found clinics:', clinics.length);

    // 4. Assign Doctor to Clinics and set Weekly Template
    for (const clinic of clinics) {
      const assignRes = await fetch(`http://127.0.0.1:3000/api/v1/pharma/telemedicine/admin/doctors/${doctor.id}/assign-clinic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId: clinic.id,
          fee: doctor.consultationFee,
          type: clinic.type === 'Video Room' ? 'video' : 'physical'
        })
      });
      const link = await assignRes.json();
      console.log('Assigned to clinic:', clinic.name, 'LinkID:', link.id);

      // Set Template: Monday to Friday, 9 AM to 5 PM
      const templates = [];
      for (let day = 1; day <= 5; day++) {
        templates.push({
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "17:00",
          slotDuration: 30
        });
      }

      await fetch(`http://127.0.0.1:3000/api/v1/pharma/telemedicine/admin/doctor-clinics/${link.id}/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates })
      });
      console.log('Set weekly template for:', clinic.name);
    }
  } catch (e) {
    console.error('Seed error:', e.message);
  }
}

seed();
