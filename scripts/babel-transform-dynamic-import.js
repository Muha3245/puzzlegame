module.exports = function dynamicImportToRequire({ types: t }) {
  return {
    name: 'dynamic-import-to-require',
    visitor: {
      CallExpression(path) {
        if (!path.get('callee').isImport()) {
          return;
        }

        const [source] = path.node.arguments;
        if (!t.isStringLiteral(source)) {
          return;
        }

        if (source.value === '@opentelemetry/api') {
          path.replaceWith(
            t.callExpression(
              t.memberExpression(t.identifier('Promise'), t.identifier('resolve')),
              [t.nullLiteral()]
            )
          );
          return;
        }

        path.replaceWith(
          t.callExpression(
            t.memberExpression(
              t.callExpression(
                t.memberExpression(t.identifier('Promise'), t.identifier('resolve')),
                []
              ),
              t.identifier('then')
            ),
            [
              t.arrowFunctionExpression(
                [],
                t.callExpression(t.identifier('require'), [source])
              ),
            ]
          )
        );
      },
    },
  };
};
