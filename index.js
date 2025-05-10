// server.js
import express from "express";
import multer from "multer";
import cors from "cors";
import mysql from "mysql2";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

// These two lines are needed to replicate __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

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

app.put("/books/:id", upload.single("cover"), (req, res) => {
  const { id } = req.params;
  const { title, description, price } = req.body;
  const cover = req.file ? req.file.filename : null;

  let q = "UPDATE books SET title = ?, description = ?, price = ?";
  const values = [title, description, price];

  if (cover) {
    q += ", cover = ?";
    values.push(cover);
  }

  q += " WHERE id = ?";
  values.push(id);

  db.query(q, values, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Book updated" });
  });
});

app.delete("/books/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM books WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Book deleted" });
  });
});

app.listen(8800, () => {
  console.log("Server running on port 8800");
});
