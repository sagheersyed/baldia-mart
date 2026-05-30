async function seed() {
  const clinics = [
    { name: "City Hospital", address: "Main Blvd, Gulberg III, Lahore", type: "Hospital" },
    { name: "Gulberg Clinic", address: "Street 5, Gulberg II, Lahore", type: "Clinic" },
    { name: "Video Consultation", address: "Online", type: "Video Room" }
  ];

  for (const clinic of clinics) {
    try {
      const res = await fetch('http://localhost:3000/api/v1/pharma/telemedicine/admin/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clinic)
      });
      const data = await res.json();
      console.log('Created clinic:', data.name);
    } catch (e) {
      console.error('Error creating clinic:', clinic.name, e.message);
    }
  }
}

seed();
