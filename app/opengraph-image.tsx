import { ImageResponse } from "next/og";

export const alt = "Cosmic Detective: Explore infrared sky images over time";
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
            "linear-gradient(135deg, #07090F 0%, #0D121F 52%, #090D16 100%)",
          color: "#F3F2EA",
          fontFamily: '"Cinzel", Georgia, serif',
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: "690px",
          }}
        >
          <div
            style={{
              fontSize: "74px",
              fontWeight: 500,
              lineHeight: 1.06,
              letterSpacing: "-1px",
              color: "#F3F2EA",
              marginBottom: "22px",
            }}
          >
            Cosmic Detective
          </div>

          <div
            style={{
              fontSize: "28px",
              lineHeight: 1.4,
              color: "#B8B6C8",
              marginBottom: "32px",
            }}
          >
            Compare multi-epoch infrared sky images over time and spot hidden
            worlds that move.
          </div>

          <div
            style={{
              display: "flex",
              gap: "16px",
              fontSize: "20px",
              color: "#B5EAD7",
            }}
          >
            <span>102 Infrared Bands</span>
            <span>·</span>
            <span>Whole Sky Every 6 Months</span>
          </div>
        </div>

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
              boxShadow: "0 0 80px rgba(195, 177, 225, 0.35)",
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
