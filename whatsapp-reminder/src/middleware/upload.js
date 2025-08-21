// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");

// // Ensure uploads directory exists
// const uploadDir = path.join(__dirname, "uploads");
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true }); // Use recursive to ensure all intermediate directories are created
// }

// // Configure storage options
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadDir); // Use the resolved upload directory
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = `${Date.now()}-${file.originalname}`;
//     cb(null, uniqueSuffix); // Unique file names
//   },
// });

// // File filter to ensure only images are uploaded
// const fileFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith("image/")) {
//     cb(null, true); // Accept image files
//   } else {
//     cb(new Error("Only image files are allowed"), false);
//   }
// };

// // Multer instance
// const upload = multer({ storage, fileFilter });

// module.exports = upload;
