const COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
];

function colorFor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function initials(userName: string) {
  return userName.slice(0, 2).toUpperCase();
}

export default function Avatar({
  userName,
  profileImg,
  size = "md",
}: {
  userName: string;
  profileImg?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm"
      ? "w-7 h-7 text-xs"
      : size === "lg"
        ? "w-12 h-12 text-base"
        : "w-9 h-9 text-sm";

  if (profileImg) {
    return (
      <img
        src={profileImg}
        alt={userName}
        className={`${sizeClass} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${colorFor(userName)} rounded-full flex items-center justify-center font-medium shrink-0`}
    >
      {initials(userName)}
    </div>
  );
}
