# back/seed_curso_ia.py
"""
Semilla: crea el curso completo de prueba de Inteligencia Artificial en la BD.

Estructura (10 modulos x 4 lecciones = 40 lecciones):
  1. Video      -> bloque tipo 'video' (YouTube verificado via oembed)
  2. Lectura    -> bloque tipo 'texto' (HTML didactico, pasa el sanitizer)
  3. Material   -> bloque tipo 'recurso' (links estables)
  4. Evaluacion -> leccion tipo 'examen' sin bloques, contenido.examen_id

Ademas crea 10 examenes PUBLICADOS con 5 preguntas c/u (4 opcion_multiple +
1 verdadero_falso) = 50 preguntas, y publica el curso con bloqueo secuencial.

Uso (desde back/):
    venv\\Scripts\\python.exe seed_curso_ia.py

Idempotente: elimina primero el curso anterior con este titulo y los examenes
EXA-IA-* (junto con sus intentos, resultados, inscripciones y progresos).
"""

import uuid

from app.database import SessionLocal
from app.models.certificado import Certificado
from app.models.curso import (
    Curso,
    EvaluacionLeccion,
    InscripcionCurso,
    ProgresoLeccion,
)
from app.models.examen import Examen, Pregunta
from app.models.intento_examen import IntentoExamen
from app.models.resultado_examen import ResultadoExamen
from app.models.usuario import Usuario

TITULO = (
    "Inteligencia Artificial: Fundamentos, Modelos y Aplicación Profesional"
)
CODIGO_EXAMEN = "EXA-IA-"


def om(enunciado, opciones, correcta):
    return {"tipo": "opcion_multiple", "enunciado": enunciado,
            "opciones": opciones, "correcta": correcta}


def vf(enunciado, afirmaciones):
    return {"tipo": "verdadero_falso", "enunciado": enunciado,
            "afirmaciones": afirmaciones}


MODULOS = [
    # ------------------------------------------------------------- M01
    {
        "titulo": "Módulo 1 · Fundamentos de la inteligencia artificial",
        "video": {
            "titulo": "IBM: IA, machine learning, deep learning y IA generativa explicados",
            "url": "https://www.youtube.com/watch?v=qYNweeDHiyU",
            "duracion": "10 min",
        },
        "lectura": {
            "titulo": "Lectura: ¿qué es la IA y cómo se relaciona con el machine learning?",
            "html": """
<h2>Objetivo del módulo</h2>
<p>Al terminar este módulo podrás explicar <strong>qué es la inteligencia artificial</strong>, distinguir sus principales subcampos (machine learning, deep learning e IA generativa) y describir el ciclo de trabajo de un proyecto de IA, con un vocabulario preciso que usarás en el resto del curso.</p>

<h2>IA: la capacidad de resolver tareas con criterio</h2>
<p>La inteligencia artificial es el campo de la computación que construye sistemas capaces de realizar tareas que tradicionalmente requerían razonamiento humano: reconocer imágenes, comprender texto, decidir, predecir o generar contenido. La definición práctica que usaremos durante todo el curso es: <em>un sistema de IA es un modelo matemático aprendido a partir de datos que toma decisiones o produce resultados útiles sin que cada regla esté programada a mano</em>.</p>
<p>Durante décadas, la mayoría de los sistemas «inteligentes» se construyeron con reglas escritas por expertos (<code>si pasa X, entonces haz Y</code>). Ese enfoque funciona en dominios cerrados, pero se vuelve frágil cuando el mundo real es ambiguo: una factura mal impresa, una foto con mala luz o un correo con lenguaje informal rompen las reglas. El aprendizaje automático invierte el enfoque: en lugar de escribir las reglas, <strong>entrenamos al modelo con ejemplos</strong> para que descubra los patrones por sí mismo.</p>

<h2>La familia de la IA: ML, deep learning e IA generativa</h2>
<ul>
<li><strong>Inteligencia artificial (IA):</strong> el campo completo; cualquier técnica que dote de comportamiento inteligente a una máquina.</li>
<li><strong>Machine learning (ML):</strong> subcampo en el que los modelos aprenden patrones a partir de datos. Es la base de la mayoría de los sistemas de IA en la industria.</li>
<li><strong>Deep learning (DL):</strong> subcampo del ML basado en redes neuronales con muchas capas; domina visión, voz y lenguaje.</li>
<li><strong>IA generativa:</strong> modelos que crean contenido nuevo (texto, imágenes, código, audio) aprendiendo la distribución de los datos de entrenamiento.</li>
<li><strong>Sistemas de IA en producción:</strong> además del modelo, incluyen datos, infraestructura, monitoreo y gobierno; el modelo es solo una pieza.</li>
</ul>

<h2>Cómo aprende un modelo</h2>
<ol>
<li><strong>Datos:</strong> se recopilan ejemplos representativos (imágenes, transacciones, correos…).</li>
<li><strong>Preparación:</strong> se limpian, etiquetan y transforman a formato numérico.</li>
<li><strong>Entrenamiento:</strong> el modelo ajusta sus parámetros para reducir el error frente a las respuestas correctas.</li>
<li><strong>Evaluación:</strong> se mide el rendimiento con datos que el modelo <em>no</em> vio durante el entrenamiento.</li>
<li><strong>Despliegue:</strong> el modelo pasa a servir predicciones reales y se monitorea su comportamiento.</li>
</ol>

<h2>Vocabulario que usarás todo el curso</h2>
<ul>
<li><strong>Muestra:</strong> un solo ejemplo del dataset (una fila, una imagen).</li>
<li><strong>Etiqueta:</strong> la respuesta correcta asociada a una muestra, en aprendizaje supervisado.</li>
<li><strong>Entrenamiento vs. inferencia:</strong> aprender parámetros frente a usar el modelo entrenado.</li>
<li><strong>Hiperparámetro:</strong> configuración externa elegida por el humano (tasa de aprendizaje, número de capas).</li>
<li><strong>Métrica:</strong> número que resume qué tan bueno es el modelo (exactitud, precisión, recall).</li>
</ul>

<h2>Cierre</h2>
<p>La IA no es magia ni solo «usar un chatbot»: es ingeniería de datos más estadística aplicada a problemas concretos. A lo largo del curso construirás desde los fundamentos del aprendizaje automático hasta modelos de lenguaje y un proyecto real; el objetivo es que puedas <strong>evaluar, construir y desplegar sistemas de IA con criterio técnico y responsable</strong>.</p>
""",
        },
        "recursos": [
            ("Wikipedia: Inteligencia artificial", "https://es.wikipedia.org/wiki/Inteligencia_artificial"),
            ("IBM: What is artificial intelligence?", "https://www.ibm.com/think/topics/artificial-intelligence"),
            ("Stanford HAI: AI Index Report", "https://aiindex.stanford.edu/report/"),
        ],
        "examen": {
            "descripcion": (
                "Evalúa los conceptos fundamentales de inteligencia artificial, sus "
                "subcampos y el ciclo de trabajo de un proyecto de IA."
            ),
            "preguntas": [
                om("¿Cuál de las siguientes opciones define mejor el aprendizaje automático?",
                   ["Programar reglas explícitas para cada caso posible",
                    "Entrenar un modelo con ejemplos para que aprenda patrones sin reglas escritas a mano",
                    "Ejecutar un programa más rápido usando tarjetas gráficas",
                    "Almacenar grandes volúmenes de datos en la nube"], 1),
                om("Un sistema detecta fraudes en tarjetas a partir de transacciones históricas etiquetadas. ¿A qué subcampo pertenece principalmente?",
                   ["Visión por computadora",
                    "Machine learning supervisado",
                    "IA simbólica basada en reglas",
                    "IA generativa"], 1),
                om("¿Cuál es la principal ventaja de un modelo aprendido de datos frente a un sistema de reglas escritas por expertos?",
                   ["No necesita datos de entrenamiento",
                    "Nunca comete errores",
                    "Se adapta a patrones complejos difíciles de expresar con reglas explícitas",
                    "Funciona sin evaluación ni monitoreo"], 2),
                om("En el ciclo de trabajo de un proyecto de IA, la evaluación del modelo debe realizarse…",
                   ["Con los mismos datos usados para entrenar, para verificar consistencia",
                    "Solo después del despliegue, cuando hay datos reales",
                    "Con datos que el modelo no vio durante el entrenamiento",
                    "Únicamente con la opinión subjetiva del equipo"], 2),
                vf("Indica si cada afirmación es Verdadera o Falsa:",
                   [("El deep learning es un subcampo del machine learning.", True),
                    ("La etiqueta es la respuesta correcta de una muestra en aprendizaje supervisado.", True),
                    ("La inferencia es el proceso de ajustar los parámetros del modelo con datos nuevos.", False)]),
            ],
        },
    },
    # ------------------------------------------------------------- M02
    {
        "titulo": "Módulo 2 · Machine learning: del dato al modelo",
        "video": {
            "titulo": "StatQuest: introducción amable al machine learning",
            "url": "https://www.youtube.com/watch?v=Gv9_4yMHFhI",
            "duracion": "13 min",
        },
        "lectura": {
            "titulo": "Lectura: supervisado, no supervisado y por refuerzo",
            "html": """
<h2>Objetivo del módulo</h2>
<p>Al terminar este módulo sabrás <strong>distinguir los tres grandes tipos de aprendizaje</strong>, elegir el enfoque adecuado según el problema y los datos disponibles, y aplicar una metodología de evaluación honesta (particiones, métricas y manejo del sobreajuste).</p>

<h2>Tres formas de aprender</h2>
<ul>
<li><strong>Aprendizaje supervisado:</strong> cada muestra incluye la respuesta correcta (etiqueta). El modelo aprende una función que va de características a etiquetas. Dos tareas clásicas: <em>clasificación</em> (¿este correo es spam?) y <em>regresión</em> (¿cuánto costará esta casa?). Ejemplo: predecir si un cliente cancelará su suscripción a partir de su historial.</li>
<li><strong>Aprendizaje no supervisado:</strong> no hay etiquetas; el modelo descubre estructura oculta en los datos. Tareas: agrupamiento (segmentar clientes por comportamiento), detección de anomalías y reducción de dimensionalidad (visualizar y limpiar datos).</li>
<li><strong>Aprendizaje por refuerzo:</strong> un agente toma acciones en un entorno y recibe recompensas o castigos; aprende una política que maximiza la recompensa acumulada. Casos: control robótico, juegos, sistemas de recomendación con retroalimentación.</li>
</ul>

<h2>Cómo se construye y evalúa un modelo supervisado</h2>
<ol>
<li><strong>Separar los datos:</strong> entrenamiento, validación y prueba (holdout). El conjunto de prueba no se toca hasta el final, para estimar el rendimiento real con datos nuevos.</li>
<li><strong>Entrenar y validar:</strong> ajustar el modelo y comparar variantes (hiperparámetros) con la validación.</li>
<li><strong>Elegir métricas con sentido:</strong> <em>exactitud</em> (proporción de aciertos) sirve cuando las clases están balanceadas; <em>precisión</em> mide qué tan confiables son las alarmas que lanza el modelo; <em>recall</em> (sensibilidad) mide cuántos casos reales detecta.</li>
<li><strong>Probar una sola vez:</strong> con el conjunto de prueba ya elegido, para una estimación final sin sesgo.</li>
</ol>
<p><strong>Ejemplo:</strong> en detección de fraude, los fraudes son raros (1 de cada 1000 transacciones). Un modelo que siempre dice «no fraude» tendría 99,9% de exactitud… y sería inútil. Por eso se usan métricas como recall y F1, y se valoran más los falsos negativos (fraude perdido) que los falsos positivos (verificación extra).</p>

<h2>Sobreajuste y subajuste</h2>
<ul>
<li><strong>Subajuste (underfitting):</strong> el modelo es demasiado simple y ni siquiera captura los patrones del entrenamiento. Solución: más capacidad, mejores características, entrenar más tiempo.</li>
<li><strong>Sobreajuste (overfitting):</strong> el modelo memoriza el ruido del entrenamiento y falla con datos nuevos. Se detecta cuando el rendimiento en validación se aleja del de entrenamiento. Solución: más datos, regularización, validación cruzada, reducir la complejidad.</li>
</ul>

<h2>Buenas prácticas con datos</h2>
<ul>
<li><strong>Representatividad:</strong> los datos deben reflejar el mundo donde operará el modelo.</li>
<li><strong>Fuga de datos (data leakage):</strong> información del futuro o de la respuesta que se cuela al entrenamiento produce métricas ficticias.</li>
<li><strong>Desbalance de clases:</strong> en problemas raros (fraude, enfermedad), la métrica debe tratarse con cuidado.</li>
<li><strong>Ética y privacidad:</strong> datos personales solo con finalidad clara, consentimiento y minimización.</li>
</ul>

<h2>Cierre</h2>
<p>Elegir el enfoque correcto depende de la pregunta de negocio y de los datos disponibles; elegir la métrica correcta depende de qué error es más costoso. Con estos criterios ya puedes plantear un experimento de machine learning completo.</p>
""",
        },
        "recursos": [
            ("Wikipedia: Aprendizaje automático", "https://es.wikipedia.org/wiki/Aprendizaje_automatico"),
            ("Scikit-learn: tutorial oficial", "https://scikit-learn.org/stable/tutorial/"),
            ("Google: Machine Learning Crash Course", "https://developers.google.com/machine-learning/crash-course"),
            ("Kaggle Learn: cursos gratuitos", "https://www.kaggle.com/learn"),
        ],
        "examen": {
            "descripcion": (
                "Evalúa tipos de aprendizaje, metodología de evaluación, métricas y "
                "buenas prácticas de datos en machine learning."
            ),
            "preguntas": [
                om("¿Por qué se separan los datos en entrenamiento y prueba?",
                   ["Para que el entrenamiento sea más rápido",
                    "Para estimar cómo funcionará el modelo con datos nuevos que nunca vio",
                    "Para reducir el tamaño del dataset a la mitad",
                    "Para evitar guardar los datos en la nube"], 1),
                om("En detección de fraude, ¿qué métrica suele ser prioritaria?",
                   ["La exactitud global, porque suele estar cerca del 100%",
                    "El recall (sensibilidad), para no dejar pasar fraudes reales",
                    "El tiempo de entrenamiento del modelo",
                    "El número de parámetros del modelo"], 1),
                om("Un modelo describe perfectamente los datos de entrenamiento pero falla con datos nuevos. ¿Qué ocurre?",
                   ["Subajuste (underfitting)",
                    "Sobreajuste (overfitting)",
                    "Fuga de datos (data leakage)",
                    "Convergencia normal"], 1),
                om("¿Cuál es un ejemplo típico de aprendizaje no supervisado?",
                   ["Predecir el precio de una casa a partir de características etiquetadas",
                    "Agrupar clientes por comportamiento de compra sin etiquetas previas",
                    "Enseñar a un robot a caminar mediante recompensas",
                    "Clasificar correos como spam o no spam con un historial etiquetado"], 1),
                vf("Indica si cada afirmación es Verdadera o Falsa:",
                   [("En aprendizaje supervisado, cada muestra de entrenamiento incluye la respuesta correcta (etiqueta).", True),
                    ("El sobreajuste se corrige añadiendo complejidad infinita al modelo.", False),
                    ("La validación cruzada ayuda a estimar la estabilidad del modelo con diferentes particiones de datos.", True)]),
            ],
        },
    },
    # ------------------------------------------------------------- M03
    {
        "titulo": "Módulo 3 · Deep learning y redes neuronales",
        "video": {
            "titulo": "3Blue1Brown: ¿qué es una red neuronal?",
            "url": "https://www.youtube.com/watch?v=aircAruvnKk",
            "duracion": "19 min",
        },
        "lectura": {
            "titulo": "Lectura: de la neurona artificial al entrenamiento profundo",
            "html": """
<h2>Objetivo del módulo</h2>
<p>Al terminar este módulo entenderás <strong>qué calcula una neurona artificial</strong>, cómo las capas aprenden representaciones jerárquicas y cómo funciona el entrenamiento con gradiente descendente y retropropagación, además de los hiperparámetros que controlan el proceso.</p>

<h2>La neurona artificial</h2>
<p>Una neurona recibe varias entradas numéricas, las multiplica por <strong>pesos</strong>, suma un <strong>sesgo</strong> y aplica una <strong>función de activación</strong> para producir una salida. Es una decisión ponderada: algunas señales importan más que otras. Durante el entrenamiento, la red ajusta automáticamente esos pesos para que sus salidas se acerquen a las respuestas correctas.</p>
<p>La función de activación es crucial porque introduce <strong>no linealidad</strong>: sin ella, cualquier número de capas se comportaría como una sola transformación lineal y la red no podría aprender relaciones complejas como reconocer caras o entender frases.</p>

<h2>Capas y representación</h2>
<p>Las redes profundas apilan muchas capas: las primeras aprenden características simples (bordes, texturas, combinaciones de letras) y las siguientes las combinan en conceptos más abstractos (ojos, palabras, objetos). Esta jerarquía de representaciones es la razón del «deep» en deep learning: <strong>la red aprende qué características importan</strong> en lugar de que un humano las diseñe a mano.</p>

<h2>Aprendizaje: gradiente descendente y retropropagación</h2>
<ol>
<li>El modelo predice con los datos actuales.</li>
<li>La <strong>función de pérdida</strong> mide el error entre predicción y respuesta correcta.</li>
<li>La <strong>retropropagación</strong> propaga ese error hacia atrás por la red para calcular el gradiente de cada peso (qué tan responsable es cada peso del error).</li>
<li>El <strong>gradiente descendente</strong> ajusta cada peso en la dirección contraria al gradiente, con un paso controlado por la tasa de aprendizaje.</li>
<li>Se repite por muchas <strong>épocas</strong> hasta que la pérdida deja de bajar.</li>
</ol>

<h2>Hiperparámetros clave</h2>
<ul>
<li><strong>Tasa de aprendizaje:</strong> tamaño del paso; muy alta diverge, muy baja no aprende.</li>
<li><strong>Tamaño de lote (batch):</strong> cuántas muestras se procesan antes de actualizar pesos.</li>
<li><strong>Capas y neuronas:</strong> capacidad del modelo; más no es siempre mejor.</li>
<li><strong>Épocas:</strong> cuántas veces se recorre el dataset completo.</li>
<li><strong>Regularización:</strong> dropout, peso de la penalización (weight decay) y aumento de datos para frenar el sobreajuste.</li>
</ul>

<h2>Herramientas del ecosistema</h2>
<p>Los frameworks dominantes son <strong>PyTorch</strong> y <strong>TensorFlow/Keras</strong>, con entrenamiento acelerado en <strong>GPUs</strong> (y TPUs en la nube) por su capacidad de ejecutar miles de operaciones matriciales en paralelo. Librerías de apoyo: Hugging Face (modelos preentrenados), ONNX (intercambio de modelos) y MLflow (registro de experimentos).</p>

<h2>Cierre</h2>
<p>Una red neuronal es matemática simple repetida a gran escala: pesos, activación y gradiente. Dominar este ciclo te permite leer cualquier arquitectura moderna —incluidos los Transformers del curso— como variaciones de estas mismas ideas.</p>
""",
        },
        "recursos": [
            ("Wikipedia: Red neuronal artificial", "https://es.wikipedia.org/wiki/Red_neuronal"),
            ("Deep Learning Book (Goodfellow, Bengio, Courville)", "https://www.deeplearningbook.org/"),
            ("PyTorch: los fundamentos", "https://pytorch.org/tutorials/beginner/basics/intro.html"),
            ("TensorFlow Playground (interactivo)", "https://playground.tensorflow.org/"),
        ],
        "examen": {
            "descripcion": (
                "Evalúa el funcionamiento de las redes neuronales: neuronas, activaciones, "
                "retropropagación, hiperparámetros y herramientas."
            ),
            "preguntas": [
                om("¿Cuál es la función de una función de activación en una neurona artificial?",
                   ["Acelerar el entrenamiento usando la GPU",
                    "Introducir no linealidad para que la red pueda aprender relaciones complejas",
                    "Contar el número de capas de la red",
                    "Almacenar los datos de entrenamiento"], 1),
                om("¿Qué realiza la retropropagación (backpropagation)?",
                   ["Clasifica las imágenes de entrada directamente",
                    "Propaga el error hacia atrás para calcular el gradiente de cada peso y poder actualizarlo",
                    "Reduce el número de parámetros del modelo a la mitad",
                    "Divide el dataset en entrenamiento y prueba"], 1),
                om("La tasa de aprendizaje (learning rate) controla…",
                   ["Cuántos datos se usan por lote",
                    "El tamaño del paso con el que se ajustan los pesos en cada actualización",
                    "El número de neuronas en cada capa",
                    "Cuántas épocas dura el entrenamiento"], 1),
                om("¿Por qué el deep learning se entrenó históricamente con GPUs?",
                   ["Las GPUs no pueden hacer operaciones matriciales",
                    "Porque ejecutan miles de operaciones matriciales en paralelo con gran eficiencia",
                    "Porque almacenan datasets más grandes que el disco duro",
                    "Porque evitan el sobreajuste automáticamente"], 1),
                vf("Indica si cada afirmación es Verdadera o Falsa:",
                   [("Una red con demasiada capacidad y pocos datos tiende a sobreajustar.", True),
                    ("Dropout apaga aleatoriamente neuronas durante el entrenamiento para reducir la dependencia excesiva.", True),
                    ("Aumentar indefinidamente el número de capas siempre mejora el rendimiento en todos los datasets.", False)]),
            ],
        },
    },
    # ------------------------------------------------------------- M04
    {
        "titulo": "Módulo 4 · Visión por computadora",
        "video": {
            "titulo": "Stanford CS231n: introducción a las redes convolucionales",
            "url": "https://www.youtube.com/watch?v=vT1JzLTH4G4",
            "duracion": "58 min",
        },
        "lectura": {
            "titulo": "Lectura: cómo las computadoras aprenden a ver",
            "html": """
<h2>Objetivo del módulo</h2>
<p>Al terminar este módulo identificarás las <strong>tareas principales de la visión por computadora</strong>, explicarás qué hacen las capas de convolución y pooling en una CNN, y conocerás las prácticas de datos (aumento, transfer learning) que hacen viables estos modelos hoy.</p>

<h2>Tareas principales</h2>
<ul>
<li><strong>Clasificación:</strong> asignar una categoría a toda la imagen (¿es un gato o un perro?).</li>
<li><strong>Detección de objetos:</strong> clasificar <em>y</em> localizar los objetos con cajas delimitadoras (bounding boxes).</li>
<li><strong>Segmentación:</strong> clasificar píxel a píxel; la segmentación <em>de instancia</em> diferencia objetos individuales de la misma categoría.</li>
<li><strong>Generación y edición de imágenes</strong> y tareas multimodales (imagen + texto) heredadas de los modelos fundacionales.</li>
</ul>

<h2>CNN: convolución y pooling</h2>
<p>Una capa de convolución desliza pequeños <strong>filtros</strong> (kernels) por la imagen y produce mapas de características que detectan patrones locales: primero bordes y texturas, luego ojos, ruedas o letras. Los filtros <strong>comparten pesos</strong> en toda la imagen, lo que reduce parámetros e incorpora la intuición de que un mismo patrón puede aparecer en cualquier posición.</p>
<p>Las capas de <strong>pooling</strong> (agrupación) reducen la resolución de los mapas, disminuyendo el cómputo y aportando cierta invarianza ante pequeñas traslaciones. Apilando convoluciones y pooling, la red construye una jerarquía de representaciones cada vez más abstracta hasta llegar a la decisión final.</p>

<h2>Datos: el cuello de botella real</h2>
<ul>
<li><strong>Datasets de referencia:</strong> ImageNet (millones de imágenes etiquetadas) impulsó la revolución de 2012 con AlexNet.</li>
<li><strong>Data augmentation:</strong> rotaciones, volteos, recortes y cambios de brillo generan variaciones sintéticas que diversifican el entrenamiento y reducen el sobreajuste.</li>
<li><strong>Normalización:</strong> escalar los píxeles a un rango común para estabilizar el entrenamiento.</li>
</ul>

<h2>Del modelo a la aplicación</h2>
<p>Arquitecturas modernas como <strong>ResNet</strong> (conexiones residuales) y <strong>ViT</strong> (Transformers aplicados a imágenes) son el punto de partida habitual. El <strong>transfer learning</strong> permite partir de pesos preentrenados y ajustarlos con pocos datos propios: en la práctica, casi ningún proyecto de visión entrena desde cero. Aplicaciones: diagnóstico por imagen, control de calidad industrial, inspección agrícola, conducción asistida y análisis satelital.</p>

<h2>Límites a considerar</h2>
<p>Los modelos de visión heredan los sesgos de sus datos de entrenamiento, pueden fallar con condiciones no representadas (iluminación, clima) y son vulnerables a <strong>ataques adversariales</strong> (pegatinas sutiles que cambian la predicción). Documentar estas limitaciones parte del trabajo profesional.</p>

<h2>Cierre</h2>
<p>Ver con una máquina es resolver estadística a escala de píxeles: convolución para extraer patrones, pooling para comprimir y datos diversos para que generalice. Con estas ideas puedes leer cualquier paper moderno de visión.</p>
""",
        },
        "recursos": [
            ("Stanford CS231n: Convolutional Networks for Visual Recognition", "https://cs231n.stanford.edu/"),
            ("OpenCV: documentación oficial", "https://docs.opencv.org/4.x/"),
            ("TorchVision: modelos preentrenados", "https://pytorch.org/vision/stable/models.html"),
            ("Wikipedia: Visión por computadora", "https://es.wikipedia.org/wiki/Visi%C3%B3n_por_computador"),
        ],
        "examen": {
            "descripcion": (
                "Evalúa tareas de visión, arquitecturas convolucionales y buenas "
                "prácticas de datos para modelos de visión por computadora."
            ),
            "preguntas": [
                om("En una red convolucional (CNN), una capa de convolución principalmente…",
                   ["Reduce el tamaño de la imagen al azar",
                    "Aplica filtros que detectan patrones locales como bordes y texturas",
                    "Etiqueta las imágenes automáticamente",
                    "Convierte el modelo en un modelo de lenguaje"], 1),
                om("¿En qué se diferencia una tarea de detección de objetos de la clasificación de imagen?",
                   ["La detección solo asigna una categoría a toda la imagen",
                    "La detección además de clasificar localiza el objeto con una caja delimitadora",
                    "La detección no necesita datos de entrenamiento",
                    "La detección genera texto describiendo la imagen"], 1),
                om("¿Cuál es el objetivo del pooling (agrupación)?",
                   ["Aumentar el número de parámetros de la red",
                    "Reducir la dimensionalidad y hacer la representación más robusta ante pequeñas traslaciones",
                    "Etiquetar las imágenes del dataset",
                    "Calcular la pérdida del modelo"], 1),
                om("El data augmentation (aumento de datos) sirve para…",
                   ["Eliminar la necesidad de evaluar el modelo",
                    "Generar variaciones de las imágenes existentes para diversificar el entrenamiento y reducir el sobreajuste",
                    "Comprimir los archivos de imagen",
                    "Entrenar sin etiquetas en cualquier caso"], 1),
                vf("Indica si cada afirmación es Verdadera o Falsa:",
                   [("El transfer learning permite aprovechar modelos preentrenados y ajustarlos a una tarea propia con pocos datos.", True),
                    ("Los filtros de una convolución comparten pesos a través de toda la imagen de entrada.", True),
                    ("La segmentación de instancia asigna una sola categoría global a toda la imagen sin diferenciar objetos individuales.", False)]),
            ],
        },
    },
    # ------------------------------------------------------------- M05
    {
        "titulo": "Módulo 5 · Lenguaje natural y el mecanismo de atención",
        "video": {
            "titulo": "El Transformer explicado: attention is all you need",
            "url": "https://www.youtube.com/watch?v=XpRUTnj8Xwo",
            "duracion": "7 min",
        },
        "lectura": {
            "titulo": "Lectura: de texto a vectores, embeddings y atención",
            "html": """
<h2>Objetivo del módulo</h2>
<p>Al terminar este módulo entenderás <strong>cómo el texto se convierte en números</strong> que un modelo puede procesar, qué son los embeddings y por qué el mecanismo de atención resolvió limitaciones que arrastraban las arquitecturas secuenciales.</p>

<h2>El problema del lenguaje</h2>
<p>Las máquinas no trabajan con letras sino con números; el procesamiento de lenguaje natural (NLP) se ocupa de convertir texto en representaciones numéricas sin perder significado. El reto es que el lenguaje es ambiguo y contextual: «banco» no significa lo mismo en «banco del río» que en «banco central», y una misma frase cambia de sentido según lo que la precede.</p>

<h2>Tokenización y embeddings</h2>
<ul>
<li><strong>Tokenización:</strong> dividir el texto en unidades procesables (tokens). Pueden ser palabras completas, caracteres o <strong>subpalabras</strong> (p. ej. «aprendizaje» → «apren | dizaje»), que equilibran vocabulario pequeño y cobertura de palabras raras.</li>
<li><strong>Embeddings:</strong> cada token se representa como un <strong>vector denso</strong> donde la cercanía refleja similitud de significado y uso. A diferencia de one-hot (vectores enormes y dispersos), los embeddings capturan relaciones como género, pluralidad o analogías («rey − hombre + mujer ≈ reina»).</li>
<li><strong>Embeddings contextuales:</strong> modelos como ELMo y BERT generan la representación <em>según el contexto</em>, resolviendo la polisemia.</li>
</ul>

<h2>De las RNN a la atención</h2>
<p>Las redes recurrentes (RNN y LSTM) procesaban la secuencia paso a paso, manteniendo un estado oculto. Limitaciones: el proceso es <strong>secuencial</strong> (dificulta el paralelismo) y la información de palabras lejanas se <strong>degrada</strong> al viajar por muchas celdas, lo que complica capturar dependencias a larga distancia.</p>

<h2>Cómo funciona la atención</h2>
<p>El mecanismo de atención permite a cada token <strong>mirar directamente</strong> a los demás tokens de la secuencia y ponderar cuáles son relevantes para lo que está produciendo. Técnicamente, cada elemento genera tres vectores: <strong>consulta (Q)</strong>, <strong>clave (K)</strong> y <strong>valor (V)</strong>; se compara la consulta con todas las claves (similitud producto punto), los puntajes se convierten en pesos con softmax y se devuelve la suma ponderada de los valores.</p>
<p>Analogía: al leer «El ganado came la hierba», para resolver «came» consultas la relación con cada palabra y concentras el peso en «ganado» y «hierba», no en artículos. El modelo hace eso para todos los tokens, en paralelo, en cada capa.</p>

<h2>Aplicaciones</h2>
<p>Traducción automática, resumen, clasificación de textos, análisis de sentimiento, respuesta a preguntas y chatbots conversacionales. En todos ellos, la atención es el mecanismo que permite al modelo <strong>relacionar partes distantes</strong> de la entrada con cada salida.</p>

<h2>Cierre</h2>
<p>Tokenización da las unidades, embeddings dan el significado y la atención da el contexto. Con estos tres ingredientes, el siguiente módulo arma la arquitectura completa detrás de los modelos de lenguaje modernos.</p>
""",
        },
        "recursos": [
            ("Wikipedia: Procesamiento de lenguaje natural", "https://es.wikipedia.org/wiki/Procesamiento_de_lenguaje_natural"),
            ("The Illustrated Transformer (Jay Alammar)", "https://jalammar.github.io/illustrated-transformer/"),
            ("Hugging Face: documentación de Transformers", "https://huggingface.co/docs/transformers/index"),
            ("arXiv: Attention Is All You Need", "https://arxiv.org/abs/1706.03762"),
        ],
        "examen": {
            "descripcion": (
                "Evalúa tokenización, embeddings, limitaciones de las RNN y el "
                "funcionamiento del mecanismo de atención."
            ),
            "preguntas": [
                om("¿Qué es la tokenización en NLP?",
                   ["Traducir todo el corpus al inglés",
                    "Dividir el texto en unidades (tokens) que el modelo puede procesar",
                    "Eliminar todas las palabras vacías del dataset",
                    "Convertir imágenes a texto"], 1),
                om("El mecanismo de atención permite a un modelo…",
                   ["Reducir el tamaño del vocabulario",
                    "Ponderar qué partes de la entrada son más relevantes para producir cada salida",
                    "Eliminar la necesidad de datos de entrenamiento",
                    "Traducir entre idiomas sin modelo"], 1),
                om("¿Por qué los embeddings son útiles para representar palabras?",
                   ["Porque son identificadores únicos de cada palabra",
                    "Porque son vectores densos donde la cercanía refleja similitud de significado y uso",
                    "Porque están escritos en formato de imagen",
                    "Porque los asignan manualmente lingüistas expertos"], 1),
                om("¿Cuál es una desventaja principal de las RNN frente a los Transformers para textos largos?",
                   ["No pueden procesar secuencias",
                    "Procesan de forma secuencial, dificultando el paralelismo y el aprendizaje de dependencias muy lejanas",
                    "Solo funcionan con imágenes",
                    "Requieren siempre datos etiquetados"], 1),
                vf("Indica si cada afirmación es Verdadera o Falsa:",
                   [("En el mecanismo de atención, cada token calcula puntajes de relevancia con los demás tokens de la secuencia.", True),
                    ("El significado de una palabra nunca depende del contexto en que aparece.", False),
                    ("Tareas como resumen y traducción se benefician del modelado de dependencias a larga distancia.", True)]),
            ],
        },
    },
    # ------------------------------------------------------------- M06
    {
        "titulo": "Módulo 6 · Transformers y modelos de lenguaje (LLM)",
        "video": {
            "titulo": "Andrej Karpathy: construyamos GPT desde cero",
            "url": "https://www.youtube.com/watch?v=kCc8FmEb1nY",
            "duracion": "1 h 56 min",
        },
        "lectura": {
            "titulo": "Lectura: Transformers, la arquitectura detrás de los LLM",
            "html": """
<h2>Objetivo del módulo</h2>
<p>Al terminar este módulo describirás la <strong>arquitectura Transformer</strong>, explicarás cómo se entrena y adapta un LLM (preentrenamiento y ajuste), y comprenderás conceptos operativos como tokenización BPE, ventana de contexto, temperatura y evaluación de modelos.</p>

<h2>La arquitectura Transformer</h2>
<p>Un Transformer apila bloques compuestos por dos módulos: <strong>autorreferencia (self-attention)</strong>, donde cada token pondera su relación con todos los demás, y una <strong>red feed-forward</strong> que procesa cada posición por separado. Ambos se envuelven en conexiones residuales y normalización, más una capa de proyección a las dimensiones del vocabulario.</p>
<ul>
<li><strong>Solo decoder (p. ej. GPT):</strong> predice el siguiente token dado el contexto anterior; base de los asistentes conversacionales.</li>
<li><strong>Solo encoder (p. ej. BERT):</strong> lee toda la entrada a la vez y produce representaciones bidireccionales; ideal para clasificación y búsqueda.</li>
<li><strong>Encoder-decoder (p. ej. T5, traducción):</strong> lee con el encoder y genera con el decoder.</li>
</ul>

<h2>Preentrenamiento y ajuste (fine-tuning)</h2>
<ol>
<li><strong>Preentrenamiento autoregresivo:</strong> sobre billones de tokens, el modelo aprende a predecir el siguiente token. Esta tarea sencilla a escala masiva produce comprensión estadística del lenguaje.</li>
<li><strong>Ajuste supervisado (SFT):</strong> se afina con ejemplos de instrucción-respuesta de alta calidad.</li>
<li><strong>Preferencias humanas (RLHF/DPO):</strong> se alinea el modelo con lo que los evaluadores consideran útil, seguro y honesto.</li>
</ol>

<h2>Tokenización moderna y ventana de contexto</h2>
<p><strong>BPE (Byte Pair Encoding)</strong> segmenta el texto en subpalabras frecuentes: partes comunes del vocabulario como tokens únicos y palabras raras se componen de fragmentos. La <strong>ventana de contexto</strong> define cuántos tokens puede considerar el modelo a la vez; todo lo que queda fuera de esa ventana no existe para el modelo.</p>

<h2>Propiedades y control de la generación</h2>
<ul>
<li><strong>Pocos ejemplos (few-shot):</strong> el modelo adapta su comportamiento con solo ver unos ejemplos en el prompt, sin reentrenar.</li>
<li><strong>Temperatura y top-p:</strong> la temperatura controla la aleatoriedad (baja = determinista y conservadora; alta = más variada y arriesgada); top-p recorta las opciones de cola improbable.</li>
<li><strong>Costo:</strong> entrenar requiere infraestructura extrema; inferir consume cómputo proporcional a la longitud del contexto y de la respuesta.</li>
</ul>

<h2>Cómo se evalúan</h2>
<p><strong>Perplejidad</strong> (cuánto de sorprendido está el modelo por el texto real), <strong>benchmarks</strong> académicos (MMLU, HumanEval, GSM8K) y <strong>evaluación humana</strong> o con juez-LLM para tareas abiertas. Ninguna métrica basta: un modelo puede destacar en exámenes y fallar en uso real, por eso se evalúan también factualidad, seguridad y latencia.</p>

<h2>Cierre</h2>
<p>Los LLM no almacenan hechos en una base de datos: predicen texto con patrones aprendidos. Entender la arquitectura y su proceso de entrenamiento es lo que te permite razonar por qué fallan, cuándo sirven y cómo controlarlos.</p>
""",
        },
        "recursos": [
            ("Wikipedia: Modelo de lenguaje grande", "https://es.wikipedia.org/wiki/Modelo_de_lenguaje_grande"),
            ("Hugging Face NLP Course (gratis)", "https://huggingface.co/learn/nlp-course"),
            ("Lilian Weng: The Transformer Family", "https://lilianweng.github.io/posts/2023-01-27-the-transformer-family/"),
            ("arXiv: Language Models are Few-Shot Learners (GPT-3)", "https://arxiv.org/abs/2005.14165"),
        ],
        "examen": {
            "descripcion": (
                "Evalúa la arquitectura Transformer, el ciclo de vida de un LLM "
                "(preentrenamiento y ajuste) y su control y evaluación."
            ),
            "preguntas": [
                om("¿Cuál es la ventaja central del Transformer frente a las arquitecturas secuenciales?",
                   ["No necesita datos de texto",
                    "Procesa todos los tokens en paralelo gracias a la autorreferencia (self-attention)",
                    "Solo funciona con oraciones muy cortas",
                    "No requiere GPU"], 1),
                om("¿Qué es el preentrenamiento de un LLM?",
                   ["Ajustar el modelo con las preguntas del usuario final",
                    "Entrenar sobre un corpus masivo para aprender patrones generales del lenguaje antes de adaptarlo a tareas concretas",
                    "Instalar el modelo en el navegador",
                    "Etiquetar manualmente todo el corpus"], 1),
                om("Al generar texto, subir la temperatura del modelo produce…",
                   ["Salidas más deterministas y repetitivas",
                    "Salidas más variadas y estadísticamente arriesgadas",
                    "Un modelo con menos parámetros",
                    "Respuestas más cortas siempre"], 1),
                om("¿Qué hace la tokenización BPE (Byte Pair Encoding)?",
                   ["Convierte el texto en una imagen",
                    "Segmenta el texto en subpalabras frecuentes para equilibrar tamaño de vocabulario y cobertura",
                    "Elimina acentos y signos de puntuación",
                    "Traduce el texto a código binario"], 1),
                vf("Indica si cada afirmación es Verdadera o Falsa:",
                   [("Un modelo tipo GPT genera texto prediciendo el siguiente token dado el contexto anterior.", True),
                    ("La ventana de contexto define cuántos tokens el modelo puede considerar a la vez.", True),
                    ("Más parámetros garantizan siempre mejor rendimiento en cualquier tarea, sin excepción.", False)]),
            ],
        },
    },
    # ------------------------------------------------------------- M07
    {
        "titulo": "Módulo 7 · IA generativa",
        "video": {
            "titulo": "IA generativa explicada en 5 minutos",
            "url": "https://www.youtube.com/watch?v=NRmAXDWJVnU",
            "duracion": "5 min",
        },
        "lectura": {
            "titulo": "Lectura: IA generativa, de los modelos al producto",
            "html": """
<h2>Objetivo del módulo</h2>
<p>Al terminar este módulo diferenciarás los <strong>modelos generativos de los discriminativos</strong>, conocerás las principales familias (LLM, difusión, GAN) y sabrás cómo llevar un modelo generativo a un producto útil con prompt engineering, RAG y evaluación.</p>

<h2>Qué distingue a la IA generativa</h2>
<p>Un modelo <strong>discriminativo</strong> aprende la frontera entre clases («¿este correo es spam?»). Un modelo <strong>generativo</strong> aprende la <strong>distribución de los datos</strong> y puede muestrear ejemplos nuevos de ella: escribir párrafos, dibujar imágenes, componer melodías o generar código que nunca existió, pero que sigue el patrón de lo aprendido.</p>

<h2>Familias de modelos</h2>
<ul>
<li><strong>Modelos de lenguaje autoregresivos (GPT):</strong> generan texto secuencial prediciendo el siguiente token.</li>
<li><strong>Modelos de difusión (Stable Diffusion, Imagen):</strong> aprenden a ruido y desruido una imagen a partir de una descripción textual.</li>
<li><strong>GAN:</strong> dos redes compiten (generador vs. discriminador); históricamente clave para caras y estilo.</li>
<li><strong>Multimodales:</strong> procesan y generan texto, imagen, audio y video en un mismo modelo (visión + lenguaje).</li>
</ul>

<h2>Del modelo a la aplicación: prompt engineering</h2>
<p>La calidad de la salida depende de la instrucción. Buenas prácticas:</p>
<ol>
<li><strong>Contexto claro:</strong> quién es el usuario, qué se quiere y para qué.</li>
<li><strong>Restricciones y formato:</strong> extensión, tono, estructura de respuesta (JSON, tabla, viñetas).</li>
<li><strong>Ejemplos (few-shot):</strong> mostrar 2-3 entradas y salidas deseadas.</li>
<li><strong>Iterar:</strong> refinar la instrucción con base en resultados reales.</li>
</ol>

<h2>RAG: respuestas ancladas en tus datos</h2>
<p>Los LLM <strong>alucinan</strong>: generan respuestas confabuladas que suenan plausibles. El <strong>aumento generativo por recuperación (RAG)</strong> mitiga esto recuperando documentos propios (manuales, políticas, base de conocimiento) que se añaden al contexto; el modelo responde con esa evidencia y puede citar sus fuentes. Es el patrón estándar para chatbots corporativos.</p>

<h2>Evaluación y producción</h2>
<ul>
<li><strong>Métricas:</strong> relevancia, factualidad (¿es cierto?), cobertura, formato correcto; se evalúa con conjuntos de prueba propios y revisión humana.</li>
<li><strong>Operación:</strong> costo por consulta, latencia, límites de tasa y experiencia de usuario (avisar que es IA).</li>
<li><strong>Guardrails:</strong> filtros de contenido, restricciones de dominio y rutas a intervención humana para casos sensibles.</li>
</ul>

<h2>Cierre</h2>
<p>Un producto de IA generativa no es «llamar a la API»: es diseño de instrucciones, anclaje en datos propios, evaluación continua y control de riesgos. Con esa mirada, cualquier demo se convierte en un sistema confiable.</p>
""",
        },
        "recursos": [
            ("Wikipedia: Inteligencia artificial generativa", "https://es.wikipedia.org/wiki/Inteligencia_artificial_generativa"),
            ("Prompting Guide en español", "https://www.promptingguide.ai/es"),
            ("Hugging Face Diffusers: guía", "https://huggingface.co/docs/diffusers/index"),
            ("Stanford CRFM: HELM (evaluación de LLM)", "https://crfm.stanford.edu/helm/"),
        ],
        "examen": {
            "descripcion": (
                "Evalúa modelos generativos, familias de modelos, prompt engineering, "
                "RAG, alucinaciones y evaluación en producción."
            ),
            "preguntas": [
                om("¿Cuál es la diferencia central entre modelos discriminativos y generativos?",
                   ["Los generativos solo clasifican",
                    "Los generativos aprenden la distribución de los datos para crear contenido nuevo; los discriminativos estiman fronteras entre clases",
                    "Los discriminativos no usan datos de entrenamiento",
                    "No hay diferencia real entre ambos"], 1),
                om("El prompt engineering consiste en…",
                   ["Programar el modelo en Python",
                    "Diseñar instrucciones y contexto efectivos para guiar la salida del modelo",
                    "Entrenar el modelo con más datos",
                    "Reducir el tamaño del modelo"], 1),
                om("¿Para qué se utiliza RAG (aumento generativo por recuperación)?",
                   ["Para comprimir el modelo y ahorrar memoria",
                    "Para recuperar documentos relevantes de una base propia y añadirlos al contexto, logrando respuestas fundamentadas",
                    "Para generar imágenes a partir de texto",
                    "Para eliminar la necesidad de evaluar el modelo"], 1),
                om("Una «alucinación» de un modelo generativo es…",
                   ["Un error de servidor",
                    "Una respuesta confabulada que suena plausible pero no se sostiene en los hechos",
                    "Un sobreajuste del modelo",
                    "Una lentitud en la respuesta"], 1),
                vf("Indica si cada afirmación es Verdadera o Falsa:",
                   [("Los modelos de difusión se usan ampliamente para generar imágenes a partir de descripciones textuales.", True),
                    ("La IA generativa siempre verifica la veracidad de sus respuestas antes de emitirlas.", False),
                    ("En producción, los sistemas de IA generativa suelen combinar el modelo con bases de datos y reglas de negocio.", True)]),
            ],
        },
    },
    # ------------------------------------------------------------- M08
    {
        "titulo": "Módulo 8 · Ética, seguridad y gobernanza de la IA",
        "video": {
            "titulo": "UNESCO: ética de la IA, desafíos y gobernanza",
            "url": "https://www.youtube.com/watch?v=VqFqWIqOB1g",
            "duracion": "7 min",
        },
        "lectura": {
            "titulo": "Lectura: IA responsable, sesgos, transparencia y regulación",
            "html": """
<h2>Objetivo del módulo</h2>
<p>Al terminar este módulo reconocerás <strong>de dónde vienen los sesgos</strong> en los sistemas de IA, explicarás por qué importan la explicabilidad y la privacidad, y conocerás el marco regulatorio actual (enfoque por riesgo) y un checklist de IA responsable para tu trabajo diario.</p>

<h2>De dónde vienen los sesgos</h2>
<ul>
<li><strong>Datos históricos:</strong> si el histórico refleja desigualdades (crédito, contratación), el modelo las aprende y amplifica.</li>
<li><strong>Muestreo desigual:</strong> grupos subrepresentados reciben peor rendimiento.</li>
<li><strong>Objetivos mal definidos:</strong> optimizar la métrica equivocada produce conductas indeseadas (p. ej. maximizar engagement a costa del bienestar).</li>
<li><strong>Etiquetamiento subjetivo:</strong> anotadores humanos aportan sus propios sesgos.</li>
</ul>
<p><strong>Ejemplo clásico:</strong> un modelo de selección de currículums entrenado con promociones históricas de una empresa con desequilibrio de género aprendió a penalizar perfiles asociados a ese desequilibrio, aunque nadie lo programó así.</p>

<h2>Transparencia y explicabilidad</h2>
<p>Muchos modelos modernos son «cajas negras». La <strong>explicabilidad</strong> permite entender, auditar y discutir decisiones que afectan a personas (un crédito denegado, una suspensión). Herramientas: importancia de características, explicaciones locales, y <strong>fichas técnicas de modelo</strong> que documentan origen de datos, métricas, límites y contexto de uso previsto. Explicar no es solo cumplir la norma: es ganar confianza y detectar errores.</p>

<h2>Privacidad y seguridad</h2>
<ul>
<li><strong>Minimización:</strong> tratar solo los datos estrictamente necesarios para la finalidad.</li>
<li><strong>Anonimización y control:</strong> datos personales con base legal, consentimiento y plazos de conservación.</li>
<li><strong>Robustez:</strong> resistir entradas manipuladas (ataques adversariales) y usos indebidos (deepfakes, suplantación).</li>
<li><strong>Seguridad del modelo:</strong> fugas de datos por prompts, inyección de instrucciones y abuso de APIs.</li>
</ul>

<h2>Marco regulatorio</h2>
<p>La tendencia global es la <strong>regulación por niveles de riesgo</strong>. El marco de la UE (EU AI Act) prohíbe prácticas inaceptables (p. ej. puntuación social), impone obligaciones reforzadas a aplicaciones de alto riesgo (salud, empleo, educación, infraestructuras), y reglas de transparencia para sistemas como los chatbots. En paralelo, la <strong>Recomendación sobre la Ética de la IA de la UNESCO</strong> fija principios internacionales (proporción, no maleficencia, equidad, transparencia) y existen estándares de gestión como ISO/IEC 42001.</p>

<h2>Checklist de IA responsable</h2>
<ol>
<li>¿Los datos son representativos del contexto de uso?</li>
<li>¿Se miden métricas <strong>por segmento</strong>, no solo el promedio?</li>
<li>¿Hay revisión humana para decisiones de alto impacto?</li>
<li>¿El modelo y sus limitaciones están documentados?</li>
<li>¿Hay monitoreo continuo post-despliegue?</li>
<li>¿Las personas afectadas pueden reclamar o pedir explicación?</li>
<li>¿Se evaluó el impacto antes de desplegar?</li>
</ol>

<h2>Cierre</h2>
<p>La responsabilidad no la hereda el modelo: la tienen las personas y organizaciones que lo diseñan y despliegan. Integrar ética desde el diseño es lo que separa un experimento interesante de un sistema digno de confianza.</p>
""",
        },
        "recursos": [
            ("UNESCO: Recomendación sobre Ética de la IA", "https://www.unesco.org/es/artificial-intelligence/recommendation-ethics"),
            ("Comisión Europea: marco regulatorio de la IA", "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai"),
            ("Wikipedia: Sesgo algorítmico", "https://es.wikipedia.org/wiki/Sesgo_algor%C3%ADtmico"),
            ("Google: Responsible AI Practices", "https://ai.google/responsibility/responsible-ai-practices/"),
        ],
        "examen": {
            "descripcion": (
                "Evalúa sesgos, explicabilidad, privacidad, marco regulatorio y "
                "buenas prácticas de IA responsable."
            ),
            "preguntas": [
                om("Un modelo de crédito aprueba con menos frecuencia a un grupo porque refleja datos históricos de desigualdad. ¿Qué problema ilustra?",
                   ["Sobreajuste del modelo",
                    "Sesgo algorítmico heredado de los datos",
                    "Baja dimensionalidad",
                    "Falta de parámetros"], 1),
                om("¿Por qué es importante la explicabilidad en los sistemas de IA?",
                   ["Porque hace que el modelo sea más rápido",
                    "Porque permite entender, auditar y discutir las decisiones que afectan a las personas",
                    "Porque reduce el costo de la GPU",
                    "Porque elimina todo riesgo legal"], 1),
                om("El marco regulatorio europeo de la IA regula con un enfoque…",
                   ["Que prohíbe cualquier uso de IA en Europa",
                    "Por niveles de riesgo: desde prácticas prohibidas hasta aplicaciones de mínimo riesgo",
                    "Exclusivo para organismos gubernamentales",
                    "Sin sanciones ni obligaciones"], 1),
                om("El principio de minimización de datos en sistemas de IA indica que…",
                   ["Deben recopilarse todos los datos posibles «por si sirven»",
                    "Solo deben tratarse los datos estrictamente necesarios para la finalidad",
                    "Los datos pueden venderse a terceros libremente",
                    "Los datos deben conservarse indefinidamente"], 1),
                vf("Indica si cada afirmación es Verdadera o Falsa:",
                   [("Los datos de entrenamiento pueden reproducir y amplificar desigualdades existentes.", True),
                    ("Añadir más variables a un modelo garantiza que será más justo.", False),
                    ("Un sistema de IA de alto riesgo requiere supervisión humana y documentación reforzada.", True)]),
            ],
        },
    },
    # ------------------------------------------------------------- M09
    {
        "titulo": "Módulo 9 · IA para negocios: estrategia y casos de uso",
        "video": {
            "titulo": "Harvard Business Review: la IA cambia las reglas del negocio",
            "url": "https://www.youtube.com/watch?v=Gol8PECt-To",
            "duracion": "26 min",
        },
        "lectura": {
            "titulo": "Lectura: estrategia de adopción de IA en la empresa",
            "html": """
<h2>Objetivo del módulo</h2>
<p>Al terminar este módulo sabrás <strong>identificar y priorizar casos de uso de IA</strong> con criterios de negocio, reconocerás los requisitos de datos y organización, y contarás con un marco para pilotar, medir y escalar proyectos de IA dentro de una empresa.</p>

<h2>Empezar por el valor, no por la tecnología</h2>
<p>El error más común es comprar una herramienta y luego buscar qué hacer con ella. El enfoque correcto parte de la pregunta de negocio: <strong>¿qué decisión, proceso o experiencia mejora si predigo, clasifico o genero algo?</strong></p>
<p>Prioriza casos de uso con una matriz <strong>valor × viabilidad</strong>:</p>
<ul>
<li><strong>Valor:</strong> impacto en costo, ingreso, riesgo o experiencia del cliente.</li>
<li><strong>Viabilidad:</strong> ¿hay datos suficientes y accesibles? ¿es técnicamente posible? ¿es aceptable legal y éticamente?</li>
</ul>

<h2>Preparación: datos y gente</h2>
<ul>
<li><strong>Datos:</strong> calidad, integración entre sistemas y gobierno (quién responde por ellos). En la práctica, la mayor parte del trabajo es ingeniería de datos.</li>
<li><strong>Talento:</strong> equipos multidisciplinarios (dominio de negocio, datos e ingeniería) rinden mejor que «magos de la IA» aislados.</li>
<li><strong>Build vs. buy:</strong> construir internamente da control y diferenciación; comprar (SaaS, APIs, open source) da velocidad. Casi siempre se empieza comprando y se internaliza lo crítico.</li>
</ul>

<h2>Casos de uso por área</h2>
<ul>
<li><strong>Marketing:</strong> personalización, segmentación, generación y prueba de creatividades.</li>
<li><strong>Soporte:</strong> clasificación de tickets, asistencia a agentes y chatbots con base de conocimiento (RAG).</li>
<li><strong>Operaciones:</strong> previsión de demanda, mantenimiento predictivo, optimización de rutas.</li>
<li><strong>Finanzas:</strong> detección de fraude, scoring, conciliación automatizada.</li>
<li><strong>Talento:</strong> criba de candidatos con supervisión humana (uso de alto riesgo: exige transparencia).</li>
</ul>

<h2>Gestión del cambio</h2>
<ol>
<li><strong>Piloto acotado:</strong> un caso, una métrica, plazo definido y criterios de éxito/fracaso escritos <em>antes</em> de empezar.</li>
<li><strong>Comunicación:</strong> explicar qué hace y qué no hace la IA; el miedo al reemplazo se combina con información y capacitación.</li>
<li><strong>Rediseño de procesos:</strong> la IA no automatiza un proceso roto; lo amplifica. Ajuste el flujo de trabajo alrededor del modelo.</li>
<li><strong>Escala deliberada:</strong> solo si el piloto demostró valor medible.</li>
</ol>

<h2>Métricas de éxito y riesgos</h2>
<p>Define KPIs antes/después (tiempo de respuesta, tasa de conversión, costo por caso) y considera el <strong>costo total</strong>: datos, integración, monitoreo, capacitación y reentrenamiento. Riesgos a gestionar: dependencia de proveedor, degradación del modelo con el tiempo (drift), incidentes de reputación y cumplimiento normativo.</p>

<h2>Cierre</h2>
<p>La IA genera valor cuando responde a una pregunta de negocio concreta, con datos confiables y adopción real en el día a día. La tecnología es la parte fácil; la estrategia es lo que separa los pilotos exitosos de los que mueren en la demostración.</p>
""",
        },
        "recursos": [
            ("McKinsey: insights de QuantumBlack (IA)", "https://www.mckinsey.com/capabilities/quantumblack"),
            ("Harvard Business Review: tema Inteligencia Artificial", "https://hbr.org/topic/subject/artificial-intelligence"),
            ("IBM: artificial intelligence in business", "https://www.ibm.com/think/topics/artificial-intelligence-business"),
            ("OECD.AI: observatorio de políticas de IA", "https://oecd.ai/"),
        ],
        "examen": {
            "descripcion": (
                "Evalúa estrategia de adopción, priorización de casos de uso, "
                "pilotos, métricas de negocio y riesgos de la IA en empresas."
            ),
            "preguntas": [
                om("¿Cuál debe ser el primer paso para adoptar IA en una empresa?",
                   ["Comprar la herramienta de moda del mercado",
                    "Identificar casos de uso con valor de negocio claro y datos disponibles",
                    "Crear un departamento de IA sin casos definidos",
                    "Reemplazar al equipo de ventas existente"], 1),
                om("Un piloto de IA exitoso debe definirse con…",
                   ["Solo una demo llamativa, sin métricas",
                    "Un caso de uso acotado, una métrica de negocio y criterios de éxito/fracaso antes de empezar",
                    "El mayor número posible de casos a la vez",
                    "Ninguna métrica, solo la opinión del equipo"], 1),
                om("La decisión «build vs. buy» en IA se refiere a…",
                   ["Construir la oficina propia frente a alquilarla",
                    "Desarrollar la solución internamente frente a adquirir una plataforma o API externa",
                    "Comprar datos frente a obtener datos públicos",
                    "Entrenar el modelo frente a no entrenarlo"], 1),
                om("Al desplegar modelos en operaciones, es crucial monitorear…",
                   ["Solo el costo del servidor",
                    "La deriva de datos (data drift) y el desempeño en producción frente al objetivo de negocio",
                    "Únicamente los «likes» en redes sociales",
                    "Nada: una vez desplegado, el modelo queda listo para siempre"], 1),
                vf("Indica si cada afirmación es Verdadera o Falsa:",
                   [("Los chatbots de soporte bien diseñados pueden reducir tiempos de respuesta y liberar a los equipos de tareas repetitivas.", True),
                    ("El costo total de un sistema de IA incluye datos, integración, monitoreo y capacitación, no solo el modelo.", True),
                    ("Una vez desplegado, un modelo de IA mantiene su rendimiento sin ninguna revisión.", False)]),
            ],
        },
    },
    # ------------------------------------------------------------- M10
    {
        "titulo": "Módulo 10 · Proyecto práctico: de la idea al prototipo",
        "video": {
            "titulo": "Andrej Karpathy: construye una red neuronal desde cero",
            "url": "https://www.youtube.com/watch?v=VMj-3S1tku0",
            "duracion": "2 h 26 min",
        },
        "lectura": {
            "titulo": "Lectura: metodología de proyecto, de la idea al prototipo",
            "html": """
<h2>Objetivo del módulo</h2>
<p>Al terminar este módulo sabrás <strong>planificar un proyecto de IA de extremo a extremo</strong>: definir el problema y su métrica, partir de un baseline honesto, experimentar de forma reproducible, evaluar con criterio de negocio y entregar un prototipo monitoreable.</p>

<h2>Paso 1: problema y métrica de negocio</h2>
<p>Escribe el problema en una frase: <em>«Queremos [decisión/mejora] para [usuario] midiendo [indicador]»</em>. Distingue dos niveles de métrica:</p>
<ul>
<li><strong>Métrica técnica:</strong> exactitud, F1, AUC, RMSE… mide al modelo.</li>
<li><strong>Métrica de negocio:</strong> dinero ahorrado, ingresos incrementados, tiempo reducido, riesgo evitado… mide el impacto real.</li>
</ul>
<p>Si no puedes conectar ambas, el proyecto probablemente no vale la pena. También define el <strong>baseline</strong>: ¿qué pasa hoy? (reglas actuales, promedio histórico, intuición de un experto).</p>

<h2>Paso 2: datos</h2>
<ol>
<li>Disponibilidad real (acceso, licencias, calidad documentada).</li>
<li><strong>Separar el conjunto de prueba antes de experimentar</strong>: cualquier decisión tomada mirando el test lo contamina (fuga de datos).</li>
<li>Revisión ética: ¿los datos pueden usarse para este fin? ¿hay datos sensibles?</li>
</ol>

<h2>Paso 3: modelo base y experimentación</h2>
<ul>
<li><strong>Empieza simple:</strong> reglas, regresión, árbol de decisión o un modelo lineal. Un baseline sólido en una tarde vale más que una arquitectura sofisticada sin referencia.</li>
<li><strong>Complejiza solo si la métrica lo justifica</strong> y puedes explicar el porqué del salto.</li>
<li><strong>Registra cada experimento:</strong> versión de datos, parámetros, métrica y fecha. Lo que no se registra no se puede comparar ni reproducir.</li>
</ul>

<h2>Paso 4: evaluación honesta</h2>
<ul>
<li>Rendimiento en el holdout, una sola vez para la decisión final.</li>
<li><strong>Análisis de errores por segmento:</strong> ¿falla más en grupos o contextos críticos?</li>
<li>Falsos positivos vs. falsos negativos: costéalos con el negocio (¿qué es peor aquí?).</li>
<li>Prueba con datos adversariales o casos límite reales.</li>
</ul>

<h2>Paso 5: prototipo y siguiente paso</h2>
<ol>
<li><strong>Interfaz mínima:</strong> una API, un formulario o un tablero que entregue valor real.</li>
<li><strong>Monitoreo:</strong> alertas de deriva de datos y caída de métricas; log de predicciones.</li>
<li><strong>Plan de mejora:</strong> qué datos recolectar, cuándo reentrenar, quién es responsable.</li>
</ol>

<h2>Checklist de entrega</h2>
<ul>
<li>Problema escrito con métrica de negocio y baseline.</li>
<li>Dataset documentado (origen, licencia, limitaciones).</li>
<li>Comparación baseline vs. modelo con métricas técnicas <em>y</em> de negocio.</li>
<li>Análisis de errores por segmento.</li>
<li>Limitaciones conocidas y casos donde el modelo no debe usarse.</li>
<li>Plan de monitoreo y responsables.</li>
</ul>

<h2>Cierre del curso</h2>
<p>Has recorrido el arco completo: qué es la IA, cómo aprenden los modelos, cómo ven y entienden las máquinas, cómo funcionan los Transformers y la IA generativa, cómo se gobierna con responsabilidad y cómo se traduce todo eso en valor de negocio. La IA no reemplaza el criterio: <strong>lo potencia</strong>. El siguiente paso es elegir un problema real tuyo y aplicar esta metodología de principio a fin.</p>
""",
        },
        "recursos": [
            ("Google: Machine Learning Crash Course", "https://developers.google.com/machine-learning/crash-course"),
            ("Scikit-learn: guía del usuario", "https://scikit-learn.org/stable/user_guide.html"),
            ("Kaggle: competiciones y datasets", "https://www.kaggle.com/competitions"),
            ("Google Colab: notebooks gratuitos", "https://colab.research.google.com/"),
        ],
        "examen": {
            "descripcion": (
                "Evalúa la metodología de proyecto: problema y métricas, gestión de "
                "datos, experimentación, evaluación y puesta en marcha."
            ),
            "preguntas": [
                om("¿Por qué conviene establecer un baseline antes de entrenar modelos complejos?",
                   ["Porque ocupa menos memoria",
                    "Porque da un punto de referencia simple para saber si la complejidad aporta valor real",
                    "Porque evita necesitar datos",
                    "Porque garantiza la aprobación del proyecto"], 1),
                om("¿Cuál es el orden correcto al dividir los datos en un proyecto?",
                   ["Dividir los datos después de entrenar todos los modelos",
                    "Separar primero el conjunto de prueba (holdout), que no se toca hasta la evaluación final",
                    "Mezclar todo y usar el mismo conjunto para entrenar y probar",
                    "No dividir: usar todo el dataset para entrenar"], 1),
                om("La «deriva de datos» (data drift) significa que…",
                   ["Los datos se perdieron en la nube",
                    "Las características de los datos en producción cambian con el tiempo respecto a las del entrenamiento",
                    "El modelo cambia automáticamente de idioma",
                    "El servidor está fallando"], 1),
                om("En el análisis de errores, los falsos negativos son…",
                   ["Casos que el modelo acierta por casualidad",
                    "Casos positivos reales que el modelo no detectó",
                    "Casos negativos que el modelo clasifica bien",
                    "Datos duplicados en el dataset"], 1),
                vf("Indica si cada afirmación es Verdadera o Falsa:",
                   [("La métrica de negocio debe alinearse con la decisión real que mejorará el proyecto.", True),
                    ("Es aceptable omitir documentar las limitaciones conocidas de un modelo en producción.", False),
                    ("Los experimentos deben registrarse para poder reproducirlos y compararlos.", True)]),
            ],
        },
    },
]

REQUISITOS = [
    "Computadora con acceso a internet y al menos 4 GB de RAM",
    "Conocimientos básicos de programación (Python recomendado, no obligatorio)",
    "Fundamentos de matemáticas de nivel secundario (se explican los conceptos necesarios)",
    "No se requiere experiencia previa en inteligencia artificial",
]

OBJETIVOS = [
    "Explicar los conceptos fundamentales de la IA, el machine learning y el deep learning con vocabulario profesional",
    "Distinguir los tipos de aprendizaje (supervisado, no supervisado y por refuerzo) y elegir el enfoque adecuado para cada problema",
    "Entender la arquitectura Transformer y el funcionamiento interno de los modelos de lenguaje (LLM)",
    "Aplicar buenas prácticas de evaluación, ética y gobernanza en proyectos de IA",
    "Evaluar casos de uso de IA en negocios y definir métricas de éxito",
    "Desarrollar un proyecto práctico completo: de la definición del problema al prototipo medible",
]

DESCRIPCION = (
    "Domina la inteligencia artificial desde sus fundamentos hasta aplicaciones "
    "profesionales. Este recorrido completo de 10 módulos te lleva por el camino que "
    "sigue la industria: qué es y cómo aprende un modelo de IA, machine learning "
    "aplicado, redes neuronales y deep learning, visión por computadora, procesamiento "
    "de lenguaje natural, la arquitectura Transformer detrás de los LLM, IA generativa, "
    "ética y gobernanza, estrategia de IA para negocios y un proyecto práctico de "
    "extremo a extremo.\n\n"
    "Cada módulo incluye un video de referencia, una lectura estructurada, material de "
    "estudio seleccionado y una evaluación con retroalimentación inmediata. Al terminar "
    "podrás evaluar, construir y desplegar soluciones de IA con criterio técnico y "
    "responsable.\n\n"
    "Más de 6 horas de video seleccionado de las mejores fuentes abiertas (IBM, Stanford, "
    "3Blue1Brown, Andrej Karpathy, StatQuest, UNESCO y Harvard Business Review), lecturas "
    "didácticas y 10 evaluaciones con 50 preguntas en total."
)


def uid():
    return str(uuid.uuid4())


def limpiar_anteriores(db, docente_id):
    """Elimina el curso anterior (si existe) y los examenes EXA-IA-*, con sus rastros."""
    cursos_viejos = db.query(Curso).filter(Curso.titulo == TITULO).all()
    for c in cursos_viejos:
        db.query(Certificado).filter(Certificado.curso_id == c.id).delete(
            synchronize_session=False)
        db.query(EvaluacionLeccion).filter(
            EvaluacionLeccion.curso_id == c.id).delete(synchronize_session=False)
        db.query(ProgresoLeccion).filter(
            ProgresoLeccion.curso_id == c.id).delete(synchronize_session=False)
        db.query(InscripcionCurso).filter(
            InscripcionCurso.curso_id == c.id).delete(synchronize_session=False)
        db.delete(c)

    examenes_viejos = db.query(Examen).filter(
        Examen.codigo.like(CODIGO_EXAMEN + "%")).all()
    ids = [e.id for e in examenes_viejos]
    if ids:
        db.query(ResultadoExamen).filter(
            ResultadoExamen.examen_id.in_(ids)).delete(synchronize_session=False)
        db.query(IntentoExamen).filter(
            IntentoExamen.examen_id.in_(ids)).delete(synchronize_session=False)
        db.query(Pregunta).filter(
            Pregunta.examen_id.in_(ids)).delete(synchronize_session=False)
        for e in examenes_viejos:
            db.delete(e)

    db.flush()
    return len(cursos_viejos), len(ids)


def crear_examen(db, docente_id, n, datos):
    examen = Examen(
        id=uid(),
        codigo=f"{CODIGO_EXAMEN}M{n:02d}",
        titulo=f"Evaluación del módulo {n}",
        descripcion=datos["descripcion"],
        tiempo_limite=15,
        puntaje_aprobacion=60.0,
        estado="PUBLICADO",
        configuracion={},
        intentos_permitidos=3,
        grupo_id=None,
        docente_id=docente_id,
    )
    db.add(examen)
    for i, p in enumerate(datos["preguntas"], start=1):
        if p["tipo"] == "opcion_multiple":
            pregunta = Pregunta(
                id=uid(),
                examen_id=examen.id,
                tipo="opcion_multiple",
                enunciado=p["enunciado"],
                puntos=20.0,
                orden=i,
                opcion_a=p["opciones"][0],
                opcion_b=p["opciones"][1],
                opcion_c=p["opciones"][2],
                opcion_d=p["opciones"][3],
                respuesta_correcta=str(p["correcta"]),
            )
        else:
            pregunta = Pregunta(
                id=uid(),
                examen_id=examen.id,
                tipo="verdadero_falso",
                enunciado=p["enunciado"],
                puntos=20.0,
                orden=i,
                afirmaciones=[
                    {"id": f"af{j+1}", "texto": texto, "esVerdadero": es_vd}
                    for j, (texto, es_vd) in enumerate(p["afirmaciones"])
                ],
            )
        db.add(pregunta)
    db.flush()
    return examen.id


def construir_modulos(db, docente_id):
    modulos = []
    for n, datos in enumerate(MODULOS, start=1):
        examen_id = crear_examen(db, docente_id, n, datos["examen"])
        id_video = uid()
        id_lectura = uid()
        id_material = uid()
        id_eval = uid()
        modulo = {
            "id": uid(),
            "titulo": datos["titulo"],
            "lecciones": [
                {
                    "id": id_video,
                    "titulo": f"Video: {datos['video']['titulo']}",
                    "tipo": "video",
                    "duracion": datos["video"]["duracion"],
                    "bloques": [{
                        "id": uid(),
                        "titulo": datos["video"]["titulo"],
                        "tipo": "video",
                        "contenido": {"video_url": datos["video"]["url"]},
                    }],
                },
                {
                    "id": id_lectura,
                    "titulo": datos["lectura"]["titulo"],
                    "tipo": "texto",
                    "bloques": [{
                        "id": uid(),
                        "titulo": datos["lectura"]["titulo"],
                        "tipo": "texto",
                        "contenido": {"texto": datos["lectura"]["html"]},
                    }],
                },
                {
                    "id": id_material,
                    "titulo": f"Material de estudio: {datos['titulo'].split('· ')[-1]}",
                    "tipo": "recurso",
                    "bloques": [{
                        "id": uid(),
                        "titulo": "Lecturas y referencias recomendadas",
                        "tipo": "recurso",
                        "contenido": {
                            "archivos": [
                                {"nombre": nombre, "url": url}
                                for nombre, url in datos["recursos"]
                            ]
                        },
                    }],
                },
                {
                    "id": id_eval,
                    "titulo": f"Evaluación del módulo {n}",
                    "tipo": "examen",
                    "contenido": {"examen_id": examen_id},
                    "bloques": [],
                },
            ],
        }
        modulos.append(modulo)
    return modulos


def main():
    db = SessionLocal()
    try:
        docente = db.query(Usuario).filter(Usuario.id == "03518c7d-cf20-42ba-9108-347abdfb65a3").first()
        if docente is None:
            docente = db.query(Usuario).filter(Usuario.email == "docente@zenth.com").first()
        if docente is None:
            raise SystemExit("No se encontro el usuario docente de prueba (docente@zenth.com)")
        print(f"Docente: {docente.email} ({docente.id}) rol={docente.rol}")

        cursos_borrados, examenes_borrados = limpiar_anteriores(db, docente.id)
        if cursos_borrados or examenes_borrados:
            print(f"Eliminados: {cursos_borrados} curso(s), {examenes_borrados} examen(es) anteriores")

        modulos = construir_modulos(db, docente.id)

        nombre_docente = " ".join(
            p for p in [docente.nombres, docente.apellidos] if p) or docente.email
        curso = Curso(
            id=uid(),
            titulo=TITULO,
            descripcion=DESCRIPCION,
            categoria="ia",
            nivel="todos",
            docente_id=docente.id,
            docente_nombre=nombre_docente,
            duracion="12 h",
            precio_tipo="gratis",
            precio_monto=None,
            moneda="PEN",
            tipo_bloqueo="secuencial",
            bloqueo_config={},
            certificado_habilitado=True,
            certificado_nota_minima=14,
            imagen_url=None,
            estado="PUBLICADO",
            modulos=modulos,
            estudiantes_count=0,
            rating=0,
            rating_count=0,
            etiquetas=[
                "inteligencia artificial", "machine learning", "deep learning",
                "ia generativa", "llm", "data science",
            ],
            requisitos=REQUISITOS,
            objetivos=OBJETIVOS,
            publico_objetivo=(
                "Profesionales, emprendedores, estudiantes y equipos técnicos que quieren "
                "incorporar inteligencia artificial a su trabajo o estudios con criterio "
                "práctico y responsable, sin experiencia previa en IA."
            ),
        )
        db.add(curso)
        db.commit()

        n_lecciones = sum(len(m["lecciones"]) for m in modulos)
        n_preguntas = db.query(Pregunta).filter(
            Pregunta.examen_id.in_(
                [l["contenido"]["examen_id"] for m in modulos for l in m["lecciones"]
                 if l["tipo"] == "examen"]
            )).count()
        print(f"Curso creado: {curso.id}")
        print(f"  titulo      : {curso.titulo}")
        print(f"  estado      : {curso.estado} | bloqueo: {curso.tipo_bloqueo} | "
              f"certificado: min {float(curso.certificado_nota_minima)}/20")
        print(f"  modulos     : {len(modulos)}")
        print(f"  lecciones   : {n_lecciones} (10 video, 10 texto, 10 recurso, 10 examen)")
        print(f"  examenes    : 10 PUBLICADOS con {n_preguntas} preguntas")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
