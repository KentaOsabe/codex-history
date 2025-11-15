import { ChangeEvent } from 'react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  inputId?: string
  disabled?: boolean
  ariaDescribedBy?: string
}

const SearchInput = ({
  value,
  onChange,
  placeholder = 'キーワードで検索',
  className,
  inputId = 'sessions-date-list-search-input',
  disabled = false,
  ariaDescribedBy,
}: SearchInputProps) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value)
  }

  return (
    <input
      id={inputId}
      className={className}
      type="text"
      value={value}
      placeholder={placeholder}
      aria-describedby={ariaDescribedBy ?? 'sessions-date-list-search-help'}
      autoComplete="off"
      onChange={handleChange}
      disabled={disabled}
    />
  )
}

export default SearchInput
