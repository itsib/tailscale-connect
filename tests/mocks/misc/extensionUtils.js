const libs = imports.libs;

const FakeExtension = {
  imports: {
    libs,
  }
}

var getCurrentExtension = function getCurrentExtension() {
  return FakeExtension;
}