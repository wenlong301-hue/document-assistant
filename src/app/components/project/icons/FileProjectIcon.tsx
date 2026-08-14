export function FileProjectIcon({ className = "w-[52px] h-[52px]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 18C14 13.5817 17.5817 10 22 10H38.1863C40.308 10 42.3429 10.8429 43.8431 12.3431L51.6569 20.1569C53.1571 21.6571 54 23.692 54 25.8137V50C54 54.4183 50.4183 58 46 58H22C17.5817 58 14 54.4183 14 50V18Z" fill="url(#fileProjectIconGradient)" />
      <path d="M22 27.5C22 26.6716 22.6716 26 23.5 26H36.5C37.3284 26 38 26.6716 38 27.5C38 28.3284 37.3284 29 36.5 29H23.5C22.6716 29 22 28.3284 22 27.5Z" fill="white" />
      <path d="M22 37.5C22 36.6716 22.6716 36 23.5 36H42.5C43.3284 36 44 36.6716 44 37.5C44 38.3284 43.3284 39 42.5 39H23.5C22.6716 39 22 38.3284 22 37.5Z" fill="white" />
      <defs>
        <linearGradient id="fileProjectIconGradient" x1="34" y1="58" x2="34" y2="10" gradientUnits="userSpaceOnUse">
          <stop stopColor="#131212" />
          <stop offset="1" stopColor="#535353" />
        </linearGradient>
      </defs>
    </svg>
  );
}

