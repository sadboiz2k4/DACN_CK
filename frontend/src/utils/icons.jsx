import * as LucideIcons from 'lucide-react'

// Chuyển "shopping-bag" → "ShoppingBag" để match Lucide component name
const toPascalCase = (str) =>
  str.split(/[-_\s]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')

// Map alias (tên DB không khớp hoàn toàn với Lucide)
const ALIAS = {
  'utensils':      'Utensils',
  'shopping-bag':  'ShoppingBag',
  'shopping_bag':  'ShoppingBag',
  'shopping':      'ShoppingCart',
  'piggy-bank':    'PiggyBank',
  'trending-up':   'TrendingUp',
  'dollar-sign':   'DollarSign',
  'file-text':     'FileText',
  'graduation':    'GraduationCap',
  'dollar':        'DollarSign',
  'gamepad':       'Gamepad2',
}

const TYPE_DEFAULT = {
  INCOME:   'TrendingUp',
  EXPENSE:  'TrendingDown',
  TRANSFER: 'ArrowLeftRight',
}

// Component dùng chung
export function CategoryIcon({ name, type, size = 18, className = '' }) {
  let iconName = ALIAS[name?.toLowerCase()] || toPascalCase(name || '') || TYPE_DEFAULT[type] || 'Tag'
  let Icon = LucideIcons[iconName]

  if (!Icon) {
    Icon = LucideIcons[TYPE_DEFAULT[type]] || LucideIcons['Tag']
  }

  return <Icon size={size} className={className} />
}

// Giữ lại resolveIcon (trả về string emoji) cho nơi nào cần
export const resolveIcon = (icon, type) => {
  const map = {
    utensils:'🍽️','shopping-bag':'🛍️',shopping:'🛍️',book:'📚',
    heart:'❤️',car:'🚗',home:'🏠',coffee:'☕',music:'🎵',gift:'🎁',
    'dollar-sign':'💵',dollar:'💵',wallet:'👜',briefcase:'💼',
    'trending-up':'📈','piggy-bank':'🐷',zap:'⚡',star:'⭐',tag:'🏷️',
    plane:'✈️',phone:'📱',tv:'📺',gamepad:'🎮',scissors:'✂️',
    'file-text':'📄',monitor:'🖥️',shirt:'👕',baby:'👶',graduation:'🎓',
    film:'🎬',dumbbell:'🏋️',bike:'🚲',bus:'🚌',
  }
  if (!icon) return type==='INCOME'?'💰':type==='TRANSFER'?'🔄':'💸'
  if ([...icon].some(c=>c.codePointAt(0)>127)) return icon
  return map[icon.toLowerCase()]||map[icon.replace(/\s+/g,'-').toLowerCase()]||'🏷️'
}
