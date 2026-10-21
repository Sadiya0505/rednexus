export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Bombay"];

export const BLOOD_COMPATIBILITY = {
    "A+": ["A+", "AB+"],
    "A-": ["A+", "A-", "AB+", "AB-"],
    "B+": ["B+", "AB+"],
    "B-": ["B+", "B-", "AB+", "AB-"],
    "AB+": ["AB+"],
    "AB-": ["AB+", "AB-"],
    "O+": ["O+", "A+", "B+", "AB+"],
    "O-": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], // Universal donor
    "Bombay": ["Bombay"]
};

export const DEFAULT_INVENTORY = {
    "A+": 25,
    "A-": 12,
    "B+": 8,
    "B-": 5,
    "AB+": 14,
    "AB-": 4,
    "O+": 3,
    "O-": 9,
    "Bombay": 2
};

export const DEFAULT_DONORS = [
    {
        id: "RN-24081",
        name: "Maya Thompson",
        blood: "O+",
        mobile: "9876543210",
        city: "San Francisco",
        last: "2025-12-12",
        status: "Eligible"
    },
    {
        id: "RN-24076",
        name: "Daniel Okafor",
        blood: "A-",
        mobile: "9812345678",
        city: "Oakland",
        last: "2025-10-22",
        status: "Eligible"
    },
    {
        id: "RN-24064",
        name: "Sofia Martinez",
        blood: "B+",
        mobile: "9765432109",
        city: "Berkeley",
        last: "2025-08-03",
        status: "Due soon"
    }
];

export const DEFAULT_REQUESTS = [
    {
        id: 1,
        patient: "Harper James",
        hospital: "St. Mary's Medical Center",
        contact: "9898989898",
        units: 3,
        blood: "O-",
        level: "Critical",
        status: "Pending",
        date: "2026-08-26"
    }
];
