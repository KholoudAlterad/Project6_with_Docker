export function FlowerLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Leaves */}
      <path
        d="M20 40C20 40 15 35 15 28C15 23 18 20 22 20C22 20 20 25 20 28C20 32 22 36 24 38L20 40Z"
        fill="#43A047"
        opacity="0.8"
      />
      <path
        d="M44 40C44 40 49 35 49 28C49 23 46 20 42 20C42 20 44 25 44 28C44 32 42 36 40 38L44 40Z"
        fill="#2E7D32"
        opacity="0.8"
      />
      <path
        d="M32 48C32 48 28 52 24 52C20 52 18 48 18 44C18 44 22 46 24 46C27 46 30 44 32 42V48Z"
        fill="#66BB6A"
        opacity="0.7"
      />
      
      {/* Pink Flower - Top */}
      <ellipse cx="32" cy="20" rx="4" ry="5" fill="#EC407A" />
      <ellipse cx="28" cy="22" rx="4" ry="5" transform="rotate(-30 28 22)" fill="#F48FB1" />
      <ellipse cx="36" cy="22" rx="4" ry="5" transform="rotate(30 36 22)" fill="#F06292" />
      <circle cx="32" cy="22" r="2" fill="#FFF59D" />
      
      {/* Orange Flower - Left */}
      <ellipse cx="20" cy="28" rx="4" ry="5" transform="rotate(20 20 28)" fill="#FF7043" />
      <ellipse cx="18" cy="30" rx="4" ry="5" transform="rotate(-20 18 30)" fill="#FFAB91" />
      <ellipse cx="22" cy="31" rx="4" ry="5" transform="rotate(60 22 31)" fill="#FF8A65" />
      <circle cx="20" cy="30" r="2" fill="#FFF9C4" />
      
      {/* Purple Flower - Right */}
      <ellipse cx="44" cy="28" rx="4" ry="5" transform="rotate(-20 44 28)" fill="#AB47BC" />
      <ellipse cx="46" cy="30" rx="4" ry="5" transform="rotate(20 46 30)" fill="#CE93D8" />
      <ellipse cx="42" cy="31" rx="4" ry="5" transform="rotate(-60 42 31)" fill="#BA68C8" />
      <circle cx="44" cy="30" r="2" fill="#FFF9C4" />
      
      {/* Yellow Flower - Center */}
      <ellipse cx="32" cy="32" rx="5" ry="6" fill="#FDD835" />
      <ellipse cx="28" cy="34" rx="5" ry="6" transform="rotate(-40 28 34)" fill="#FFEB3B" />
      <ellipse cx="36" cy="34" rx="5" ry="6" transform="rotate(40 36 34)" fill="#FBC02D" />
      <ellipse cx="30" cy="30" rx="5" ry="6" transform="rotate(-80 30 30)" fill="#FFEE58" />
      <ellipse cx="34" cy="30" rx="5" ry="6" transform="rotate(80 34 30)" fill="#FDD835" />
      <circle cx="32" cy="32" r="3" fill="#FF6F00" />
      
      {/* Red Flower - Bottom */}
      <ellipse cx="32" cy="42" rx="4" ry="5" fill="#E53935" />
      <ellipse cx="29" cy="40" rx="4" ry="5" transform="rotate(-45 29 40)" fill="#EF5350" />
      <ellipse cx="35" cy="40" rx="4" ry="5" transform="rotate(45 35 40)" fill="#F44336" />
      <circle cx="32" cy="41" r="2" fill="#FFFDE7" />
    </svg>
  );
}
