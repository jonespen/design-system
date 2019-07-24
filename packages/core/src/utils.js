import React from 'react'
import hoistStatics from 'hoist-non-react-statics'
import { themeGet, color as systemColor } from 'styled-system'
import { css } from 'styled-components'

export const mapProps = map => Component =>
  hoistStatics(props => <Component {...map(props)} />, Component)

// Use this to mark props as deprecated
export const deprecatedPropType = replacement => (
  props,
  propName,
  componentName
) => {
  if (props[propName]) {
    return new Error(
      `The \`${propName}\` prop is deprecated and will be removed in a future release. Please use \`${replacement}\` instead.`
    )
  }
}

/**
 * Converts a hex color to rgb
 *
 * @example hexToRgb('#007aff') => 'rgb(0, 122, 255)'
 *
 * @param {string} color The color to transform to rgb
 *
 * @returns {string} The color in rgb
 */
const hexToRgb = color => {
  color = color.substring(1)

  let colors = color.match(new RegExp(`.{1,${color.length / 3}}`, 'g'))

  if (colors) {
    colors = colors
      .map(val => parseInt(val.length === 1 ? val + val : val, 16))
      .join(', ')
  }

  return colors ? `rgb(${colors})` : ''
}

/**
 * Decomposes a color into an array of values
 *
 * @example decomposeColor('#007aff') => [0, 122, 255]
 *
 * @param {string} color The color to decompose
 *
 * @returns {Array} An array of the color values
 */
const decomposeColor = color => {
  if (color.charAt(0) === '#') {
    return decomposeColor(hexToRgb(color))
  }

  return color
    .substring(color.indexOf('(') + 1, color.length - 1)
    .split(',')
    .map(value => parseFloat(value))
}

/**
 * Gets the luminance of a color
 *
 * @example getLuminance('#007aff') => 0.211
 * @see https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-tests
 *
 * @param {string} color The color to get the luminance of
 *
 * @return {Number} The luminance of the color
 */
const getLuminance = color => {
  const [r, g, b] = decomposeColor(color).map(val => {
    val = val / 255
    return val <= 0.03928 ? val / 12.92 : ((val + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Gets the contrast ratio between two colors
 *
 * @example getContrastRatio('#007aff', '#fff') => 4.016975780478911
 * @see https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-tests
 *
 * @param {string} colorA
 * @param {string} colorB
 *
 * @return {Number} The contrast ratio
 */
const getContrastRatio = (colorA, colorB) => {
  const luminA = getLuminance(colorA)
  const luminB = getLuminance(colorB)
  return (Math.max(luminA, luminB) + 0.05) / (Math.min(luminA, luminB) + 0.05)
}

/**
 * Applies the selected variant style to a styled component.
 * Combines the variant style with any custom styling from
 * theme.componentStyles[component][variant]
 *
 * Once updated to styled-components v4, componentName is no
 * longer needed as it is part of forwardedClass.displayName
 *
 * @param {string}  componentName The name of the component
 * @param {Object=} variants      An object of variant styles
 *
 * @returns {array}
 */
export const applyVariant = (componentName, variants = null) => props => {
  const { color, variant } = props

  if (variants && typeof color === 'string' && typeof variant === 'string') {
    const keyName = `${variant}${color[0].toUpperCase()}${color.substring(1)}`

    return (variants[variant] || []).concat(
      themeGet(`componentStyles.${componentName}.${keyName}`, [])(props)
    )
  }

  return themeGet(`componentStyles.${componentName}`, [])(props)
}

/**
 * Gets the color of a palette color, using props.color as
 * the palette key. If palette color does not exist, falls
 * back to theme.colors
 *
 * @example getPaletteColor('dark') => will return the dark
 * color of theme.palette[props.color].dark
 *
 * @param {string} name The name of the palette color
 *
 * @returns {string|null}
 */
export const getPaletteColor = name => props => {
  let { color } = props
  const [match, colorMatch, nameMatch] = name.match(/(.+)\.(.+)/) || []

  if (match && colorMatch && nameMatch) {
    color = colorMatch
    name = nameMatch
  }
  const paletteColor = themeGet(`palette.${color}.${name}`)(props)

  if (paletteColor) {
    return paletteColor
  }

  return (
    themeGet(`colors.${name}${color[0].toUpperCase()}${color.substring(1)}`)(
      props
    ) || themeGet(`colors.${color}`)(props)
  )
}

/**
 * Checks if the given color prop is a valid palette color
 *
 * @param {Object} props
 *
 * @returns {boolean}
 */
export const hasPaletteColor = props => {
  if (props.theme && typeof props.theme.palette === 'object') {
    const paletteColors = Object.keys(props.theme.palette)

    return paletteColors.includes(props.color)
  }

  return false
}

/**
 * Gets the text color that belongs on a given background color
 *
 * @param {string} name The name of the background color
 *
 * @returns {string} The text color that belongs on the background
 */
export const getTextColorOn = name => props => {
  const { theme } = props

  if (theme.palette) {
    const color = getPaletteColor(name)(props)
    const text = theme.palette.text

    if (color) {
      return getContrastRatio(text.light, color) >= theme.contrastRatio
        ? text.light
        : text.base
    }

    return text.base
  }

  return ''
}

/**
 * Extended color function from styled-system. First checks
 * for a palette color before falling back to styled-system
 *
 * @param {Object} props
 *
 * @returns {fn|InterpolationValue[]}
 */
export const color = props => {
  if (props.theme && typeof props.theme.palette == 'object') {
    const paletteColors = Object.keys(props.theme.palette)

    if (paletteColors.includes(props.color)) {
      return css`
        background-color: ${getPaletteColor('base')};
        color: ${getTextColorOn('base')};
      `
    }
  }

  return systemColor
}
