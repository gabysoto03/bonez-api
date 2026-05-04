function parsePgError(error) {
  switch (error.code) {
    case '23505': {
      const match = error.detail?.match(/Key \((.+?)\)=/);
      const campo = match ? match[1] : 'campo';
      return { status: 409, message: `Ya existe un registro con ese ${campo}` };
    }
    case '23503':
      return { status: 409, message: 'No se puede realizar esta acción porque existen datos relacionados' };
    case '23502':
      return { status: 400, message: `El campo "${error.column}" es requerido y no puede estar vacío` };
    case '22P02':
      return { status: 400, message: 'El formato de algún campo no es válido' };
    default:
      return null;
  }
}

function handleError(res, error, defaultMessage = 'Ocurrió un error en el servidor') {
  const parsed = parsePgError(error);
  if (parsed) {
    return res.status(parsed.status).json({ message: parsed.message });
  }
  return res.status(500).json({ message: defaultMessage });
}

module.exports = { handleError };
