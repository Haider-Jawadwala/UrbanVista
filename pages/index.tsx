import type { NextPage } from "next";
import Head from "next/head";
import Hero from "../components/Hero/Hero";
import Weather from "../components/Weather/Weather";
import Data from "../components/EnvData/Data";
import About from "../components/About/About";
import Footer from "../components/Footer/Footer"

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>UrbanVista</title>
        <meta
          name="description"
          content="UrbanVista"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Hero message="" />
      <Weather />
      <Data />
      <About />
      <Footer/>
    </>
  );
};

export default Home;
