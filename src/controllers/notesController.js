const Note = require("../models/Note");
const { validationResult } = require("express-validator");
const { summarizeText } = require("../services/geminiService");

// ─────────────────────────────────────────────
// @desc    Get all notes (latest first)
// @route   GET /api/notes
// @access  Public
// ─────────────────────────────────────────────
const getAllNotes = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const query = search
      ? {
          user: req.user._id,
          $or: [
            { title: { $regex: search, $options: "i" } },
            { content: { $regex: search, $options: "i" } },
          ],
        }
      : { user: req.user._id };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notes, total] = await Promise.all([
      Note.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Note.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: notes.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: notes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching notes",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get a single note by ID
// @route   GET /api/notes/:id
// @access  Public
// ─────────────────────────────────────────────
const getNoteById = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: note,
    });
  } catch (error) {
    // Handle invalid ObjectId format
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID format",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error while fetching note",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Create a new note
// @route   POST /api/notes
// @access  Public
// ─────────────────────────────────────────────
const createNote = async (req, res) => {
  // Validate incoming request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  try {
    const { title, content } = req.body;

    const note = await Note.create({ title, content, user: req.user._id });

    return res.status(201).json({
      success: true,
      message: "Note created successfully",
      data: note,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while creating note",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Update an existing note
// @route   PUT /api/notes/:id
// @access  Public
// ─────────────────────────────────────────────
const updateNote = async (req, res) => {
  // Validate incoming request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  try {
    const { title, content } = req.body;

    const update = {};
    if (title !== undefined) update.title = title;
    if (content !== undefined) update.content = content;

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      update,
      {
        new: true,          // return updated document
        runValidators: true, // run schema validators on update
      }
    );

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Note updated successfully",
      data: note,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID format",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error while updating note",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Delete a note
// @route   DELETE /api/notes/:id
// @access  Public
// ─────────────────────────────────────────────
const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Note deleted successfully",
      data: { id: req.params.id },
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID format",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error while deleting note",
      error: error.message,
    });
  }
};

// @desc    Summarize note content with Gemini
// @route   POST /api/notes/:id/summarize
// @access  Private
const summarizeNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    const summary = await summarizeText({
      title: note.title,
      content: note.content,
    });

    return res.status(200).json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID format",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while summarizing note",
      error: error.message,
    });
  }
};

module.exports = {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  summarizeNote,
};
