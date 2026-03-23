import fs from "fs";

const firstNames = [
  "Rahul", "Amit", "Sneha", "Priya", "Arjun", "Kavya", "Rohan", "Neha",
  "Vikram", "Anjali", "Kiran", "Pooja", "Suresh", "Meera", "Aditya",
  "Nikhil", "Divya", "Harsha", "Deepak", "Swathi"
];

const lastNames = [
  "Sharma", "Reddy", "Verma", "Naidu", "Iyer", "Gupta", "Mehta",
  "Patel", "Khan", "Choudhary", "Yadav", "Singh", "Nair", "Das"
];

const specializations = [
  "Criminal Law",
  "Corporate Law",
  "Family Law",
  "Civil Law",
  "Intellectual Property",
  "Tax Law",
  "Cyber Law",
  "Real Estate Law"
];

const cities = [
  "Hyderabad",
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad"
];

const languagesPool = ["English", "Hindi", "Telugu", "Tamil", "Kannada"];

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomLanguages() {
  const shuffled = [...languagesPool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.floor(Math.random() * 3) + 1);
}

const lawyers = [];

for (let i = 1; i <= 100; i++) {
  const gender = Math.random() > 0.5 ? "men" : "women";
  const imgId = Math.floor(Math.random() * 90) + 1;

  const lawyer = {
    id: `lawyer_${i.toString().padStart(3, "0")}`,
    name: `${getRandom(firstNames)} ${getRandom(lastNames)}`,
    specialization: getRandom(specializations),
    location: getRandom(cities),
    experience: Math.floor(Math.random() * 25) + 1,
    rating: parseFloat((Math.random() * 2 + 3).toFixed(1)), // 3.0–5.0
    casesHandled: Math.floor(Math.random() * 500) + 20,
    languages: getRandomLanguages(),
    image: `https://randomuser.me/api/portraits/${gender}/${imgId}.jpg`
  };

  lawyers.push(lawyer);
}

fs.writeFileSync("lawyers.json", JSON.stringify(lawyers, null, 2));

console.log("✅ 100 lawyers dataset generated: lawyers.json");