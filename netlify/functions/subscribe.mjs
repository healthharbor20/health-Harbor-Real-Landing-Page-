export default async (req) => {
  const jsonHeaders = {
    "Content-Type": "application/json"
  };

  const sendJson = (status, body) =>
    new Response(JSON.stringify(body), {
      status,
      headers: jsonHeaders
    });

  if (req.method !== "POST") {
    return sendJson(405, {
      success: false,
      message: "Method not allowed"
    });
  }

  try {
    const body = await req.json();

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const guideTitle = String(body.guideTitle || "").trim();

    if (!email) {
      return sendJson(400, {
        success: false,
        message: "Email is required"
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendJson(400, {
        success: false,
        message: "Please enter a valid email address"
      });
    }

    const apiKey = process.env.BREVO_API_KEY;
    const listId = Number(process.env.BREVO_LIST_ID);

    if (!apiKey) {
      return sendJson(500, {
        success: false,
        message: "Missing BREVO_API_KEY in Netlify environment variables"
      });
    }

    const payload = {
      email,
      updateEnabled: true,
      emailBlacklisted: false,
      smsBlacklisted: false
    };

    if (!Number.isNaN(listId)) {
      payload.listIds = [listId];
    }

    // IMPORTANT:
    // This assumes you created a Brevo contact attribute called NAME.
    // If you did NOT create NAME in Brevo, remove this block.
    if (name) {
      payload.attributes = {
        NAME: name
      };
    }

    const brevoResponse = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify(payload)
    });

    const brevoData = await brevoResponse.json().catch(() => ({}));

    if (!brevoResponse.ok) {
      return sendJson(brevoResponse.status, {
        success: false,
        message: brevoData.message || "Brevo request failed",
        details: brevoData
      });
    }

    return sendJson(200, {
      success: true,
      message: guideTitle
        ? `Success! You signed up for "${guideTitle}".`
        : "Success! You are subscribed."
    });
  } catch (error) {
    return sendJson(500, {
      success: false,
      message: error.message || "Server error"
    });
  }
};
