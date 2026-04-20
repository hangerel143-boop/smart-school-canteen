import ProjectCard from '@/components/ProjectCard'

const projects = [
  {
    title: 'Lost & Found',
    description: 'Report lost items and help classmates recover their belongings.',
    href: '/lost-found',
    emoji: '🔍',
  },
  {
    title: 'News Board',
    description: 'Post and browse school news, announcements, and updates.',
    href: '/news-board',
    emoji: '📰',
  },
  {
    title: 'Club Manager',
    description: 'Join school clubs and track attendance with ease.',
    href: '/club-manager',
    emoji: '🎯',
  },
  {
    title: 'Smart Canteen',
    description: 'Browse the menu and place food orders without the queue.',
    href: '/smart-canteen',
    emoji: '🍱',
  },
]

export default function Home() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">School Project Hub</h2>
        <p className="text-gray-500 mt-2">Choose one idea and build your prototype with AI support.</p>
      </div>
      <p className="text-sm text-blue-700 font-medium mb-6 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 inline-block">
        👇 Choose a project to start
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {projects.map((p) => (
          <ProjectCard key={p.href} {...p} />
        ))}
      </div>
    </div>
  )
}
