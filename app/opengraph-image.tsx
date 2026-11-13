import { ImageResponse } from "next/og";

export const alt = "Cosmic Detective — Explore NASA SPHEREx infrared sky images over time";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "72px 84px",
          background:
            "linear-gradient(135deg, #0B0B1E 0%, #1A1040 52%, #0D1B2A 100%)",
          color: "#EDEBFF",
          fontFamily: "sans-serif",
        }}
      >
        {/* Left Text Column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: "690px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: "999px",
              background: "rgba(255, 181, 167, 0.14)",
              border: "1px solid rgba(255, 181, 167, 0.45)",
              color: "#FFB5A7",
              fontSize: "20px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: "28px",
            }}
          >
            NASA SPHEREx All-Sky Infrared Survey
          </div>

          <div
            style={{
              fontSize: "74px",
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: "-1px",
              color: "#EDEBFF",
              marginBottom: "22px",
            }}
          >
            COSMIC DETECTIVE
          </div>

          <div
            style={{
              fontSize: "28px",
              lineHeight: 1.4,
              color: "#CFCBEA",
              marginBottom: "32px",
            }}
          >
            Compare real NASA SPHEREx infrared sky images over time and spot
            hidden worlds that move.
          </div>

          <div
            style={{
              display: "flex",
              gap: "16px",
              fontSize: "20px",
              color: "#B5EAD7",
            }}
          >
            <span>102 Infrared Colours</span>
            <span>·</span>
            <span>Whole Sky Every 6 Months</span>
            <span>·</span>
            <span>1 Billion+ Objects</span>
          </div>
        </div>

        {/* Right Small Pastel Planet with Ring */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "300px",
            height: "300px",
            position: "relative",
          }}
        >
          <div
            style={{
              width: "210px",
              height: "210px",
              borderRadius: "999px",
              background:
                "radial-gradient(circle at 32% 28%, #FFB5A7 0%, #C3B1E1 52%, #4B3A8C 95%)",
              boxShadow: "0 0 80px rgba(195, 177, 225, 0.45)",
              border: "2px solid rgba(255, 255, 255, 0.25)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "290px",
              height: "88px",
              borderRadius: "999px",
              border: "5px solid rgba(255, 181, 167, 0.72)",
              transform: "rotate(-20deg)",
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

