// Lightweight OpenAPI documentation endpoint for API testing.
export default function handler(req, res) {
  const baseUrl = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}`;

  const spec = {
    openapi: "3.0.0",
    info: {
      title: "QR Attendance System API",
      version: "2.0.0",
      description: "JWT-protected attendance APIs with role-based access control"
    },
    servers: [{ url: baseUrl }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    paths: {
      "/api/register": {
        post: { summary: "Register user", tags: ["Auth"] }
      },
      "/api/login": {
        post: { summary: "Login and receive JWT access token", tags: ["Auth"] }
      },
      "/api/generateQR": {
        post: {
          summary: "Generate QR session (instructor)",
          tags: ["Instructor"],
          security: [{ bearerAuth: [] }]
        }
      },
      "/api/verifyQR": {
        post: {
          summary: "Verify QR and mark attendance (student)",
          tags: ["Student"],
          security: [{ bearerAuth: [] }]
        }
      },
      "/api/attendanceHistory": {
        get: {
          summary: "Student attendance history",
          tags: ["Student"],
          security: [{ bearerAuth: [] }]
        }
      },
      "/api/courses": {
        get: {
          summary: "List instructor courses",
          tags: ["Instructor"],
          security: [{ bearerAuth: [] }]
        }
      },
      "/api/admin/analytics": {
        get: {
          summary: "Admin analytics dashboard data",
          tags: ["Admin"],
          security: [{ bearerAuth: [] }]
        }
      },
      "/api/admin/export": {
        get: {
          summary: "Export attendance CSV",
          tags: ["Admin"],
          security: [{ bearerAuth: [] }]
        }
      }
    }
  };

  return res.status(200).json(spec);
}
