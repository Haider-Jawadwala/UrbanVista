import React, { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Loader } from "lucide-react";

// Dynamically import EarthCanvas with SSR disabled and custom loading
const EarthCanvas = dynamic(
  () => import("../Earth/Earth").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <Loader className="animate-spin text-blue-500" size={48} />
      </div>
    ),
  }
);

interface Props {
  message: string;
}

const phrases = [
  "Unlock Land Potential",
  "Reimagine Urban Spaces",
  "Smart Land, Sustainable Future",
  "Transform Empty Spaces",
  "Sustainable Growth Begins Here",
  "Optimize for Tomorrow",
  "Build with Data, Plan for Impact",
  "Revitalize with Purpose",
  "Eco-Friendly Land Use",
  "Future-Proof Urban Development",
  "Smart Spaces, Greener Cities",
  "Empowering Communities Through Land",
  "Sustainability Starts with Land",
  "Shaping Smarter Cities",
  "Data-Driven Land Transformation",
];

const TypingEffect = () => {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    const typeSpeed = 50;
    const deleteSpeed = 30;
    const pauseDuration = 1500;

    if (!isDeleting && currentText === currentPhrase) {
      setTimeout(() => setIsDeleting(true), pauseDuration);
    } else if (isDeleting && currentText === "") {
      setIsDeleting(false);
      setPhraseIndex((prevIndex) => (prevIndex + 1) % phrases.length);
    } else {
      const timeout = setTimeout(() => {
        setCurrentText(prev =>
          isDeleting ? prev.slice(0, -1) : currentPhrase.slice(0, prev.length + 1)
        );
      }, isDeleting ? deleteSpeed : typeSpeed);

      return () => clearTimeout(timeout);
    }
  }, [currentText, isDeleting, phraseIndex]);

  return (
    <span className="text-green-400 inline-block min-h-[1.5em]">
      {currentText}
      <span className="animate-blink">|</span>
    </span>
  );
};

const Hero = ({ message }: Props) => {
  const [isEarthLoaded, setIsEarthLoaded] = useState(false);

  useEffect(() => {
    const preloadEarth = async () => {
      try {
        await import("../Earth/Earth");
        setIsEarthLoaded(true);
      } catch (error) {
        console.error("Failed to preload Earth component:", error);
      }
    };

    preloadEarth();
  }, []);

  return (
    <div className="relative flex items-center justify-center h-screen mb-12 bg-gradient-to-b from-gray-900 to-black overflow-hidden">
      {/* EarthCanvas as background */}
      <div
        className={`absolute top-0 left-0 w-full h-full z-0 transition-opacity duration-1000 ${
          isEarthLoaded ? "opacity-100" : "opacity-0"
        }`}
      >
        <EarthCanvas />
      </div>

      {/* Overlay */}
      <div className="absolute top-0 left-0 w-full h-full bg-black/50 z-[1]" />

      {/* Content */}
      <div className="relative z-[2] p-5 text-white text-center flex flex-col items-center justify-center h-full">
        <h2 className="text-5xl sm:text-7xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 animate-fade-in-down">
          UrbanVista
        </h2>
        <h3 className="text-2xl sm:text-4xl font-semibold mb-8 animate-fade-in-up">
          <TypingEffect />
        </h3>
        <div className="flex space-x-4">
          <Link href="/PlotSubmission" passHref>
            <button className="px-6 py-3 sm:px-8 sm:py-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg animate-pulse-subtle w-52">
              Register plot
            </button>
          </Link>
          <Link href="dashboard" passHref>
            <button className="px-6 py-3 sm:px-8 sm:py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg animate-pulse-subtle w-52">
              Try it Out!!!
            </button>
          </Link>
        </div>
      </div>

      {/* Loading indicator */}
      {!isEarthLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-[3] bg-gradient-to-b from-gray-900 to-black">
          <Loader className="animate-spin text-blue-500 mb-4" size={48} />
          <p className="text-white text-lg animate-pulse">Loading...</p>
        </div>
      )}
    </div>
  );
};

export default Hero;