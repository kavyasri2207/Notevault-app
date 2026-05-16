const formatResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true,
  },
  body: JSON.stringify(body),
});

const successResponse = (payload, statusCode = 200) => {
  const response = { success: true };
  
  // If payload has a 'message', move it to the root
  if (payload && payload.message) {
    response.message = payload.message;
    delete payload.message;
  } else {
    response.message = "Success";
  }

  // Merge the rest of the payload
  Object.assign(response, payload);
  
  return formatResponse(statusCode, response);
};

const errorResponse = (message, statusCode = 500, error = null) =>
  formatResponse(statusCode, {
    success: false,
    message,
    ...(error && { error: error.message || error }),
  });

module.exports = { successResponse, errorResponse };
