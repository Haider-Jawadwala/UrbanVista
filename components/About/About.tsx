import React from 'react';

const AboutUs = () => {
  return (
    <section id="about" className="w-full py-16 px-6 bg-white">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-6 text-gray-800">About UrbanVista (UV)</h2>
        <p className="text-lg text-gray-600 mb-6">
          UrbanVista (UV) is dedicated to providing innovative solutions to urban challenges through a combination of 
          data-driven insights and technology. We leverage AI to deliver accurate weather forecasts, personalized 
          recommendations, and valuable insights about global environmental conditions. Our vision is to raise awareness 
          about climate change and offer actionable steps for a sustainable future.
        </p>
        <p className="text-lg text-gray-600 mb-6">
          At UV, we believe that technology and data can empower individuals and communities to make informed decisions 
          for a better tomorrow.
        </p>
      </div>
    </section>
  );
};

export default AboutUs;
