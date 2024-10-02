import Link from "next/link";
import React, { useEffect, useState } from "react";
import { AiOutlineClose, AiOutlineMenu } from "react-icons/ai";
import { motion } from "framer-motion";

const NavBar = () => {
  const [nav, setNav] = useState(false);
  const [color, setColor] = useState("transparent");
  const [textColor, setTextColor] = useState("white");
  const [isScrolled, setIsScrolled] = useState(false);

  const handleNav = () => {
    setNav(!nav);
  };

  useEffect(() => {
    const changeColor = () => {
      if (window.scrollY >= 90) {
        setColor("#ffffff");
        setTextColor("#000000");
        setIsScrolled(true);
      } else {
        setColor("transparent");
        setTextColor("#ffffff");
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", changeColor);
    return () => window.removeEventListener("scroll", changeColor);
  }, []);

  const menuItems = [
    { name: "Home", href: "/" },
    { name: "Weather", href: "/#weather" },
    { name: "Data", href: "/#geo-dashboard" },
    { name: "About Us", href: "/#about" },
  ];

  return (
    <motion.nav
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ backgroundColor: `${color}` }}
      className={`fixed left-0 top-0 w-full z-10 transition-all duration-300 ease-in-out ${
        isScrolled ? "shadow-lg" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
        <Link href="/">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2"
          >
            <img src="/greylogo.png" alt="Logo" className="w-10 h-10" /> {/* Add your logo image */}
            <h1 style={{ color: `${textColor}` }} className="font-bold text-2xl">
              UrbanVista
            </h1>
          </motion.div>
        </Link>
        <ul style={{ color: `${textColor}` }} className="hidden md:flex space-x-4">
          {menuItems.map((item) => (
            <motion.li
              key={item.name}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Link href={item.href}>
                <span className="p-2 cursor-pointer hover:text-blue-500 transition-colors duration-300">
                  {item.name}
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>

        {/* Mobile Button */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleNav}
          className="block md:hidden z-10 cursor-pointer"
        >
          {nav ? (
            <AiOutlineClose size={20} style={{ color: `${textColor}` }} />
          ) : (
            <AiOutlineMenu size={20} style={{ color: `${textColor}` }} />
          )}
        </motion.div>

        {/* Mobile Menu */}
        <motion.div
          initial={{ opacity: 0, x: "-100%" }}
          animate={{ 
            opacity: nav ? 1 : 0,
            x: nav ? 0 : "-100%"
          }}
          transition={{ duration: 0.3 }}
          className={`md:hidden fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center w-full h-screen bg-black text-white text-center`}
        >
          <ul>
            {menuItems.map((item) => (
              <motion.li
                key={item.name}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleNav}
                className="p-4 text-3xl hover:text-blue-500 transition-colors duration-300"
              >
                <Link href={item.href}>{item.name}</Link>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    </motion.nav>
  );
};

export default NavBar;