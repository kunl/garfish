import {
  rawObject,
  rawDocument,
  rawDocumentCtor,
  rawObjectDefineProperty,
} from '@garfish/utils';
import { Sandbox } from '../sandbox';
import { __proxyNode__ } from '../symbolTypes';
import { createFakeObject, microTaskHtmlProxyDocument } from '../utils';
import {
  createGetter,
  createSetter,
  createDefineProperty,
} from '../proxyInterceptor/document';

export const documentOverride = (sandbox: Sandbox) => {
  // eslint-disable-next-line
  let proxyDocument;
  const fakeDocument = createFakeObject(rawDocument);
  const getter = createGetter(sandbox);

  const fakeDocumentProto = new Proxy(fakeDocument, {
    get: (...args) => {
      microTaskHtmlProxyDocument(proxyDocument);
      return getter(...args);
    },
  });

  const fakeDocumentCtor = function Document() {
    if (!(this instanceof fakeDocumentCtor)) {
      throw new TypeError(
        // eslint-disable-next-line quotes
        "Failed to construct 'Document': Please use the 'new' operator.",
      );
    }
    const docInstance = new rawDocumentCtor();
    // If you inherit fakeDocumentProto,
    // you will get the properties and methods on the original document, which do not meet expectations
    rawObject.setPrototypeOf(docInstance, fakeDocument);
    return docInstance;
  };

  fakeDocumentCtor.prototype = fakeDocumentProto;
  fakeDocumentCtor.prototype.constructor = fakeDocumentCtor;

  if (Symbol.hasInstance) {
    rawObjectDefineProperty(fakeDocumentCtor, Symbol.hasInstance, {
      configurable: true,
      value(value) {
        let proto = value;
        if (proto === rawDocument) return true;
        while ((proto = rawObject.getPrototypeOf(proto))) {
          if (proto === fakeDocumentProto) {
            return true;
          }
        }
        const cloned = function () {};
        cloned.prototype = fakeDocument;
        return value instanceof cloned;
      },
    });
  }

  proxyDocument = new Proxy(
    Object.create(fakeDocumentProto, {
      currentScript: {
        value: null,
        writable: true,
      },
      [__proxyNode__]: {
        writable: false,
        configurable: false,
        value: rawDocument,
      },
    }),
    {
      set: createSetter(),
      defineProperty: createDefineProperty(),
    },
  );

  return {
    override: {
      document: proxyDocument,
      Document: fakeDocumentCtor,
    },
  };
};
