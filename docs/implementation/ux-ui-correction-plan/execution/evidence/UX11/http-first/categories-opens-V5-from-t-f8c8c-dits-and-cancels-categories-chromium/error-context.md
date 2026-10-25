# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: categories.spec.ts >> opens V5 from the menu and creates, edits and cancels categories
- Location: e2e\categories.spec.ts:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - main [ref=e5]:
    - generic [ref=e6]:
      - link "← Volver al menú" [ref=e7] [cursor=pointer]:
        - /url: /?status=ARCHIVED
      - generic [ref=e8]:
        - generic [ref=e9]:
          - heading "Catálogo de categorías" [level=1] [ref=e10]
          - paragraph [ref=e11]: Organiza las entradas del menú por categorías. Una entrada puede pertenecer a varias categorías.
        - button "Nueva categoría" [ref=e12] [cursor=pointer]
    - region "Catálogo de categorías" [ref=e13]:
      - list [ref=e14]:
        - listitem [ref=e15]:
          - generic [ref=e16]:
            - heading "Bebidas" [level=3] [ref=e17]
            - paragraph [ref=e18]: Frías
            - text: 2 entradas asociadas
          - button "Editar Bebidas" [ref=e19] [cursor=pointer]: Editar
  - dialog [ref=e20]:
    - generic [ref=e21]:
      - heading "¿Descartar los cambios sin guardar?" [level=2] [ref=e22]
      - paragraph [ref=e23]: Si sigues editando, se conservarán todos los datos de este formulario.
      - generic [ref=e24]:
        - button "Seguir editando" [active] [ref=e25] [cursor=pointer]
        - button "Descartar cambios" [ref=e26] [cursor=pointer]
```