const { connectToDatabase } = require("./shared/db");
const { successResponse, errorResponse } = require("./shared/response");
const Note = require("./Note");

exports.handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));
  
  const { routeKey, pathParameters, queryStringParameters, body, requestContext } = event;
  const userSub = requestContext.authorizer.jwt.claims.sub; // Cognito sub from JWT

  try {
    await connectToDatabase();

    // GET /api/notes
    if (routeKey === "GET /api/notes") {
      const search = queryStringParameters?.search || "";
      const limit = parseInt(queryStringParameters?.limit || "50");
      const page = parseInt(queryStringParameters?.page || "1");
      const skip = (page - 1) * limit;

      const query = search
        ? {
            user: userSub,
            $or: [
              { title: { $regex: search, $options: "i" } },
              { content: { $regex: search, $options: "i" } },
            ],
          }
        : { user: userSub };

      const [notes, total] = await Promise.all([
        Note.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Note.countDocuments(query),
      ]);

      return successResponse({
        data: notes,
        total,
        count: notes.length,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      });
    }

    // GET /api/notes/{id}
    if (routeKey === "GET /api/notes/{id}") {
      const note = await Note.findOne({ _id: pathParameters.id, user: userSub });
      if (!note) return errorResponse("Note not found", 404);
      return successResponse({ data: note });
    }

    // POST /api/notes
    if (routeKey === "POST /api/notes") {
      const { title, content } = JSON.parse(body);
      if (!title || !content) return errorResponse("Title and content are required", 400);
      
      const note = await Note.create({ title, content, user: userSub });
      return successResponse({ data: note, message: "Note created" }, 201);
    }

    // PUT /api/notes/{id}
    if (routeKey === "PUT /api/notes/{id}") {
      const { title, content } = JSON.parse(body);
      const update = {};
      if (title !== undefined) update.title = title;
      if (content !== undefined) update.content = content;

      const note = await Note.findOneAndUpdate(
        { _id: pathParameters.id, user: userSub },
        update,
        { new: true, runValidators: true }
      );
      
      if (!note) return errorResponse("Note not found", 404);
      return successResponse({ data: note, message: "Note updated" });
    }

    // DELETE /api/notes/{id}
    if (routeKey === "DELETE /api/notes/{id}") {
      const note = await Note.findOneAndDelete({ _id: pathParameters.id, user: userSub });
      if (!note) return errorResponse("Note not found", 404);
      return successResponse({ id: pathParameters.id }, "Note deleted");
    }

    return errorResponse("Route not found", 404);
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500, error);
  }
};
