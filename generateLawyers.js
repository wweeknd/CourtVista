import fs from "fs";

const maleFirstNames = [
  "Rahul", "Amit", "Arjun", "Rohan", "Vikram", "Suresh", "Aditya", "Nikhil",
  "Deepak", "Sanjay", "Rajesh", "Abhishek", "Manoj", "Karan", "Vivek", "Anil",
  "Sunil", "Pankaj", "Ravi", "Vijay", "Aman", "Varun", "Ishaan", "Yash"
];

const femaleFirstNames = [
  "Sneha", "Priya", "Kavya", "Neha", "Anjali", "Pooja", "Meera", "Divya",
  "Swathi", "Riya", "Kriti", "Shreya", "Ishita", "Tanvi", "Aditi", "Simran",
  "Nidhi", "Preeti", "Sonal", "Asha", "Ishani", "Aparna", "Sanjana", "Kiara"
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

const usedImages = { men: new Set(), women: new Set() };

const reviewTexts = [
  "Exceptional legal support throughout my case. Highly professional.",
  "Very knowledgeable and experienced. Made a complicated matter feel manageable.",
  "I was very impressed with the attention to detail and commitment.",
  "Helped me navigate a difficult property dispute with great expertise.",
  "Clear communication and strong courtroom presence. Highly recommend.",
  "Went beyond expectations. Thorough preparation and genuine care.",
  "Professional, empathetic, and skilled. Resolved my matter efficiently.",
  "An outstanding lawyer who provided practical and sound legal advice.",
  "Made the entire legal process straightforward. Excellent results.",
  "Responsive, well-prepared, and truly dedicated to the case."
];

function generateReviews(count) {
  const reviews = [];
  for (let i = 0; i < count; i++) {
    reviews.push({
      id: `rev_${Math.random().toString(36).substr(2, 9)}`,
      rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
      text: getRandom(reviewTexts),
      date: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString().split('T')[0]
    });
  }
  return reviews;
}

for (let i = 1; i <= 100; i++) {
  const gender = Math.random() > 0.5 ? "men" : "women";
  let imgId;
  
  do {
    imgId = Math.floor(Math.random() * 99) + 1;
  } while (usedImages[gender].has(imgId) && usedImages[gender].size < 99);
  
  usedImages[gender].add(imgId);

  const firstName = gender === "men" ? getRandom(maleFirstNames) : getRandom(femaleFirstNames);
  const rating = parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)); // 3.5 - 5.0
  const reviewCount = Math.floor(Math.random() * 200) + 10;

  const lawyer = {
    id: `lawyer_${i.toString().padStart(3, "0")}`,
    name: `${firstName} ${getRandom(lastNames)}`,
    gender: gender === "men" ? "Male" : "Female",
    specialization: getRandom(specializations),
    location: getRandom(cities),
    experience: Math.floor(Math.random() * 25) + 1,
    rating: rating,
    reviewCount: reviewCount,
    casesHandled: Math.floor(Math.random() * 500) + 20,
    languages: getRandomLanguages(),
    image: `https://randomuser.me/api/portraits/${gender}/${imgId}.jpg`,
    consultationFee: Math.floor(Math.random() * 3000 / 500) * 500 + 500, // 500 to 3000 in steps of 500
    verified: Math.random() > 0.3,
    isProBono: Math.random() > 0.8,
    reviews: generateReviews(Math.min(5, reviewCount))
  };

  lawyers.push(lawyer);
}

fs.writeFileSync("lawyers.json", JSON.stringify(lawyers, null, 2));

console.log("✅ 100 lawyers dataset generated: lawyers.json");