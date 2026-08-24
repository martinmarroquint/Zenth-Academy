"""
ROLES DEL SISTEMA - FUENTE ÚNICA DE VERDAD
Roles reales de la plataforma educativa: admin → docente → estudiante
"""

ROLES_SISTEMA = {
    'admin': {
        'nombre': 'Administrador',
        'nivel': 100,
        'color': '#7C3AED',
        'descripcion': 'Control total del sistema. Gestiona usuarios.',
        'es_jefatura': True,
        'sistema': True,
    },
    'docente': {
        'nombre': 'Docente',
        'nivel': 70,
        'color': '#2563EB',
        'descripcion': 'Gestiona exámenes, cursos, alumnos y carpeta.',
        'es_jefatura': True,
        'sistema': True,
    },
    'estudiante': {
        'nombre': 'Estudiante',
        'nivel': 30,
        'color': '#059669',
        'descripcion': 'Cursa lecciones, rinde exámenes y obtiene certificados.',
        'es_jefatura': False,
        'sistema': True,
    },
}

# Grupos de roles para permisos
ROLES_ADMIN = ['admin']
ROLES_DOCENTE = ['admin', 'docente']
ROLES_TODOS = ['admin', 'docente', 'estudiante']
ROLES_SOLO_LECTURA = ['estudiante']

TODOS_LOS_ROLES = list(ROLES_SISTEMA.keys())