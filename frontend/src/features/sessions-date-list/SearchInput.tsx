import { ChangeEvent } from 'react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  inputId?: string
}

const SearchInput = ({
  value,
  onChange,
  placeholder = 'キーワードで検索',
  className,
  inputId = 'sessions-date-list-search-input',
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
      aria-describedby="sessions-date-list-search-help"
      autoComplete="off"
      onChange={handleChange}
    />
  )
}

export default SearchInput
