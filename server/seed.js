export const seedData = {
  cases: [
    {
      id: "CASE-1001",
      requester: "Maria Chen",
      contact: "maria@example.com",
      neighborhood: "Riverside",
      needType: "Medication",
      vulnerability: "Senior living alone",
      urgency: 9,
      status: "Open",
      assignedTeam: "Medical Runners",
      notes: "Insulin pickup needed before tonight. Call +1 555 013 8899.",
      createdAt: "2026-06-26T09:10:00.000Z"
    },
    {
      id: "CASE-1002",
      requester: "Jamal Brooks",
      contact: "555-111-2020",
      neighborhood: "East Market",
      needType: "Food",
      vulnerability: "Single parent with two children",
      urgency: 7,
      status: "Assigned",
      assignedTeam: "Food Pantry North",
      notes: "Needs shelf-stable groceries and baby formula.",
      createdAt: "2026-06-26T11:20:00.000Z"
    },
    {
      id: "CASE-1003",
      requester: "Anonymous",
      contact: "",
      neighborhood: "Hillview",
      needType: "Shelter",
      vulnerability: "Displaced after apartment fire",
      urgency: 10,
      status: "Open",
      assignedTeam: "",
      notes: "Family of three needs overnight shelter and transport.",
      createdAt: "2026-06-26T15:45:00.000Z"
    }
  ],
  resources: [
    { id: "RES-1", name: "Medical Runners", type: "Medication", neighborhood: "Riverside", capacity: 4, available: 2 },
    { id: "RES-2", name: "Food Pantry North", type: "Food", neighborhood: "East Market", capacity: 30, available: 18 },
    { id: "RES-3", name: "Safe Nights Shelter", type: "Shelter", neighborhood: "Hillview", capacity: 12, available: 3 },
    { id: "RES-4", name: "Community Ride Desk", type: "Transport", neighborhood: "Riverside", capacity: 6, available: 4 }
  ],
  auditLog: [
    { id: "AUD-1", at: "2026-06-26T09:00:00.000Z", actor: "system", action: "seed.loaded", target: "demo-data" }
  ]
};
