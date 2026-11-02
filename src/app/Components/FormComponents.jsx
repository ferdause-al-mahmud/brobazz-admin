import { Editor } from "primereact/editor";

export const FormInputField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  min,
  disabled = false,
  helperText,
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-semibold text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      min={min}
      disabled={disabled}
      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
    />
    {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
  </div>
);

export const FormSelectField = ({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  placeholder = "Select an option",
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-semibold text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
    >
      <option value="">{placeholder}</option>
      {options.map((option, idx) => (
        <option key={idx} value={option.value || option.title}>
          {option.title}
        </option>
      ))}
    </select>
  </div>
);

export const FormEditorField = ({
  label,
  value,
  onChange,
  height = "300px",
  required = false,
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-semibold text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
      <Editor
        value={value}
        onTextChange={(e) => onChange(e.htmlValue)}
        style={{ height }}
        placeholder={label}
      />
    </div>
  </div>
);

export const SectionCard = ({ title, children }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
    {title && <h3 className="text-lg font-bold text-gray-900 mb-6">{title}</h3>}
    <div className="space-y-4">{children}</div>
  </div>
);

export const ColorInput = ({
  color,
  index,
  onColorChange,
  onRemove,
  canRemove,
}) => (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <FormInputField
        label="Hex Code"
        value={color.color || ""}
        onChange={(e) => onColorChange(index, "color", e.target.value)}
        placeholder="#FF0000"
      />
      <FormInputField
        label="Product ID"
        value={color.productId || ""}
        onChange={(e) => onColorChange(index, "productId", e.target.value)}
        placeholder="Color variant ID"
      />
      <FormInputField
        label="Color Name"
        value={color.name || ""}
        onChange={(e) => onColorChange(index, "name", e.target.value)}
        placeholder="Red, Blue"
      />
    </div>
    {canRemove && (
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline"
      >
        Remove Color
      </button>
    )}
  </div>
);

export const SizeInput = ({
  size,
  index,
  onSizeChange,
  onRemove,
  category,
  canRemove,
}) => (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <FormInputField
        label="Size"
        value={size.size || ""}
        onChange={(e) => onSizeChange(index, "size", e.target.value)}
        placeholder="e.g., S, M, L, 38"
      />
      <FormInputField
        label="Availability"
        type="number"
        value={size.availability || ""}
        onChange={(e) => onSizeChange(index, "availability", e.target.value)}
        placeholder="Quantity"
        min="0"
      />
      {category !== "Footwear" && (
        <FormInputField
          label="Measurements (Optional)"
          value={size.measurements || ""}
          onChange={(e) => onSizeChange(index, "measurements", e.target.value)}
          placeholder="e.g., 30x32"
        />
      )}
    </div>
    {canRemove && (
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline"
      >
        Remove Size
      </button>
    )}
  </div>
);

export const TypeSelector = ({ selectedTypes, onTypeToggle }) => (
  <div className="space-y-3">
    <div className="flex flex-wrap gap-2">
      {selectedTypes.map((type, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium"
        >
          {type}
          <button
            type="button"
            onClick={() => onTypeToggle(type)}
            className="text-blue-600 hover:text-blue-800 font-bold"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  </div>
);

export const LoadingButton = ({ loading, children, ...props }) => (
  <button
    {...props}
    disabled={loading || props.disabled}
    className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
  >
    {loading && (
      <svg
        className="animate-spin h-5 w-5"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          fill="currentColor"
        />
        <path
          className="opacity-75"
          fill="none"
          d="M4 12a8 8 0 018-8v1a7 7 0 00-7 7H4z"
        />
      </svg>
    )}
    {children}
  </button>
);
