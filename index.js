// server.js
import express from "express";
import multer from "multer";
import cors from "cors";
import mysql from "mysql2";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import fs from "fs";

// These two lines are needed to replicate __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const urlDB=`mysql://${process.env.MYSQLUSER}:${process.env.MYSQLPASSWORD}@${process.env.MYSQLHOST}:${process.env.MYSQLPORT}/${process.env.MYSQLDATABASE}`;

const connection=mysql.createConnection(urlDB);

// const db = mysql.createConnection({
//   host: process.env.DB_HOST || "localhost",
//   user: process.env.DB_USER || "root",
//   password: process.env.DB_PASSWORD || "Rajdeep@0342",
//   database: process.env.DB_NAME || "crud",
// });

db.connect((err) => {
  if (err) throw err;
  console.log("MySQL connected");
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

app.get("/books", (req, res) => {
  db.query("SELECT * FROM books", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

app.get("/books/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM books WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result[0]);
  });
});

app.post("/books", upload.single("cover"), (req, res) => {
  const { title, description, price } = req.body;
  const cover = req.file.filename;
  const q = "INSERT INTO books (title, description, cover, price) VALUES (?, ?, ?, ?)";
  db.query(q, [title, description, cover, price], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Book added" });
  });
});

// app.put("/books/:id", upload.single("cover"), (req, res) => {
//   const { id } = req.params;
//   const { title, description, price } = req.body;
//   const cover = req.file ? req.file.filename : null;

//   let q = "UPDATE books SET title = ?, description = ?, price = ?";
//   const values = [title, description, price];

//   if (cover) {
//     q += ", cover = ?";
//     values.push(cover);
//   }

//   q += " WHERE id = ?";
//   values.push(id);

//   db.query(q, values, (err) => {
//     if (err) return res.status(500).json(err);
//     res.json({ message: "Book updated" });
//   });
// });



app.put("/books/:id", upload.single("cover"), (req, res) => {
  const { id } = req.params;
  const { title, description, price } = req.body;
  const newCover = req.file ? req.file.filename : null;

  // Step 1: Get the old cover image
  db.query("SELECT cover FROM books WHERE id = ?", [id], (err, data) => {
    if (err) return res.status(500).json(err);
    if (data.length === 0) return res.status(404).json({ message: "Book not found" });

    const oldCover = data[0].cover;

    // Step 2: Build the update query
    let q = "UPDATE books SET title = ?, description = ?, price = ?";
    const values = [title, description, price];

    if (newCover) {
      q += ", cover = ?";
      values.push(newCover);
    }

    q += " WHERE id = ?";
    values.push(id);

    // Step 3: Perform the update
    db.query(q, values, (err) => {
      if (err) return res.status(500).json(err);

      // Step 4: Delete the old cover image if a new one was uploaded
      if (newCover && oldCover) {
        const oldImagePath = path.join("uploads", oldCover);
        fs.unlink(oldImagePath, (unlinkErr) => {
          if (unlinkErr) {
            console.warn(`Failed to delete old cover image: ${oldImagePath}`);
          }
        });
      }

      res.json({ message: "Book updated successfully" });
    });
  });
});

// app.delete("/books/:id", (req, res) => {
//   const { id } = req.params;
//   db.query("DELETE FROM books WHERE id = ?", [id], (err) => {
//     if (err) return res.status(500).json(err);
//     res.json({ message: "Book deleted" });
//   });
// });

app.delete("/books/:id", (req, res) => {
  const { id } = req.params;

  // Step 1: Get the image filename
  db.query("SELECT cover FROM books WHERE id = ?", [id], (err, data) => {
    if (err) return res.status(500).json(err);
    if (data.length === 0) return res.status(404).json({ message: "Book not found" });

    const imagePath = path.join("uploads", data[0].cover);

    // Step 2: Delete the book record from the database
    db.query("DELETE FROM books WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json(err);

      // Step 3: Delete the image file from disk
      fs.unlink(imagePath, (unlinkErr) => {
        if (unlinkErr) {
          console.warn(`Image cleanup failed or file not found: ${imagePath}`);
        }
        res.json({ message: "Book and image deleted" });
      });
    });
  });
});

let PORT=process.env.DB_PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
