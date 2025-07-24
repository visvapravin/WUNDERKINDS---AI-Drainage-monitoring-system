import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Info, LogIn } from 'lucide-react';

const images = [
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?auto=format&fit=crop&q=80&w=1200',
];

function HomePage() {
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const scrollToAbout = () => {
    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">DrainageAI</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={scrollToAbout} className="flex items-center space-x-1 text-gray-600 hover:text-blue-600">
                <Info size={20} />
                <span>About Us</span>
              </button>
              <Link to="/login" className="flex items-center space-x-1 text-gray-600 hover:text-blue-600">
                <LogIn size={20} />
                <span>Login</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative h-[500px] overflow-hidden">
        <div className="absolute inset-0">
          {images.map((img, index) => (
            <img
              key={index}
              src={img}
              alt={`Slide ${index + 1}`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                index === currentImage ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-black bg-opacity-40">
            <div className="h-full flex flex-col items-center justify-center px-4 text-center">
              <div className="text-center text-white">
                <h2 className="text-4xl font-bold mb-4">Smart Drainage Monitoring System</h2>
                <p className="text-xl">Real-time monitoring and flood prediction powered by AI</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section id="about" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">About Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <h3 className="text-xl font-semibold mb-4">Real-time Monitoring</h3>
              <p className="text-gray-600">Advanced sensors provide continuous monitoring of water levels, flow rates, and air quality.</p>
            </div>
            <div className="text-center p-6">
              <h3 className="text-xl font-semibold mb-4">AI-Powered Predictions</h3>
              <p className="text-gray-600">Machine learning algorithms analyze data to predict potential flooding events before they occur.</p>
            </div>
            <div className="text-center p-6">
              <h3 className="text-xl font-semibold mb-4">Smart Alerts</h3>
              <p className="text-gray-600">Instant notifications keep stakeholders informed about critical drainage system changes.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;