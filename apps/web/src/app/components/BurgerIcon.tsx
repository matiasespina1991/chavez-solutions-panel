import React, { useState } from 'react';
export default function Burger({
  size = 35,
  color = '#121212',
  label = 'Toggle menu',
}) {
  const [open, setOpen] = useState(false);
  return (
    <button
      className="burger"
      type="button"
      aria-label="Toggle menu"
      aria-expanded="false"
    >
      <span className="burger__line top"></span>
      <span className="burger__line middle"></span>
      <span className="burger__line bottom"></span>
    </button>
  );
}
