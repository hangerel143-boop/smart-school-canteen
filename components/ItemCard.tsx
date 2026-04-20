interface ItemCardProps {
  title: string
  subtitle?: string
  badge?: string
}

export default function ItemCard({ title, subtitle, badge }: ItemCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3 shadow-sm">
      <div>
        <p className="font-medium text-gray-800">{title}</p>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {badge && (
        <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">
          {badge}
        </span>
      )}
    </div>
  )
}
