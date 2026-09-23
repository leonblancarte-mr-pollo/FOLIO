// Logs de depuración: solo en desarrollo (en producción la consola queda limpia).
// Los logs operativos ([streak], [GEMS], [PET], [auth], errores) usan console.* directo.
export const devLog = import.meta.env.DEV ? (...args) => console.log(...args) : () => {};
