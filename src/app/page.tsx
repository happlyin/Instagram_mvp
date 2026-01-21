export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-instagram-gradient-start via-instagram-primary to-instagram-gradient-end bg-clip-text text-transparent">
            Instagram MVP
          </h1>
          <p className="text-gray-600 text-lg">
            Welcome to Instagram clone built with Next.js 14
          </p>
        </div>

        {/* Tech Stack Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-2xl font-semibold mb-4 text-instagram-blue">
              🎨 Frontend
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li>✅ Next.js 14</li>
              <li>✅ TypeScript</li>
              <li>✅ Tailwind CSS</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-2xl font-semibold mb-4 text-instagram-purple">
              🔧 Backend
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li>✅ TypeORM</li>
              <li>✅ PostgreSQL</li>
              <li>✅ JWT Auth</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-2xl font-semibold mb-4 text-instagram-primary">
              📦 Storage
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li>✅ AWS S3</li>
              <li>✅ Localstack</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-2xl font-semibold mb-4 text-green-600">
              🚀 Status
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li>✅ Setup Complete</li>
              <li>✅ Ready to Develop</li>
            </ul>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <button className="bg-gradient-to-r from-instagram-purple to-instagram-primary hover:from-instagram-primary hover:to-instagram-purple text-white font-semibold px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg">
            Start Building
          </button>
        </div>
      </div>
    </main>
  )
}
