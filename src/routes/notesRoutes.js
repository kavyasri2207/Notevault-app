const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  summarizeNote,
} = require("../controllers/notesController");
const { protect } = require("../middleware/authMiddleware");

// ── Validation Rules ──────────────────────────
const noteValidationRules = [
  body("title")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Title must be a string")
    .trim()
    .isLength({ max: 150 })
    .withMessage("Title cannot exceed 150 characters"),

  body("content")
    .notEmpty()
    .withMessage("Content is required")
    .isString()
    .withMessage("Content must be a string")
    .trim(),
];

const updateValidationRules = [
  body("title")
    .optional()
    .isString()
    .withMessage("Title must be a string")
    .trim()
    .isLength({ max: 150 })
    .withMessage("Title cannot exceed 150 characters"),

  body("content")
    .optional()
    .isString()
    .withMessage("Content must be a string")
    .trim(),
];

// ── Routes ────────────────────────────────────
// GET  /api/notes         → list all notes (supports ?page=1&limit=10&search=)
// GET  /api/notes/:id     → get single note
// POST /api/notes         → create note
// PUT  /api/notes/:id     → update note
// DELETE /api/notes/:id   → delete note

router.use(protect);

router.get("/", getAllNotes);
router.get("/:id", getNoteById);
router.post("/", noteValidationRules, createNote);
router.put("/:id", updateValidationRules, updateNote);
router.delete("/:id", deleteNote);
router.post("/:id/summarize", summarizeNote);

module.exports = router;
