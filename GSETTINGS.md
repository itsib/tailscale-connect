The `#GSettings` class provides a convenient API for storing and retrieving application settings.

Reads and writes can be considered to be non-blocking. Reading settings with `#GSettings` is typically extremely fast: on approximately the same order of magnitude (but slower than) a `#GHashTable` lookup. Writing settings is also extremely fast in terms of time to return to your application, but can be extremely expensive for other threads and other processes. Many settings backends (including dconf) have lazy initialisation which means in the common case of the user using their computer without modifying any settings a lot of work can be avoided. For dconf, the D-Bus service doesn't even need to be started in this case. For this reason, you should only ever modify #GSettings keys in response to explicit user action. Particular care should be paid to ensure that modifications are not made during startup -- for example, when setting the initial value of preferences widgets. The built-in `g_settings_bind()` functionality is careful not to write settings in response to notify signals as a result of modifications that it makes to widgets.

When creating a `GSettings` instance, you have to specify a schema that describes the keys in your settings and their types and default values, as well as some other information.

Normally, a schema has a fixed path that determines where the settings are stored in the conceptual global tree of settings. However, schemas can also be `'[relocatable][gsettings-relocatable]'`, i.e. not equipped with a fixed path. This is useful e.g. when the schema describes an 'account', and you want to be able to store a arbitrary number of accounts.
Paths must start with and end with a forward slash character ('/') and must not contain two sequential slash characters. Paths should be chosen based on a domain name associated with the program or library to which the settings belong. Examples of paths are "/org/gtk/settings/file-chooser/" and "/ca/desrt/dconf-editor/". Paths should not start with "/apps/", "/desktop/" or "/system/" as they often did in GConf.
Unlike other configuration systems (like GConf), GSettings does not restrict keys to basic types like strings and numbers. GSettings stores values as #GVariant, and allows any #GVariantType for keys. Key names are restricted to lowercase characters, numbers and '-'. Furthermore, the names must begin with a lowercase character, must not end with a '-', and must not contain consecutive dashes.
Similar to GConf, the default values in GSettings schemas can be localized, but the localized values are stored in gettext catalogs and looked up with the domain that is specified in the gettext-domain attribute of the <schemalist> or <schema> elements and the category that is specified in the l10n attribute of the <default> element. The string which is translated includes all text in the <default> element, including any surrounding quotation marks.
The l10n attribute must be set to messages or time, and sets the locale category for translation . The messages category should be used by default; use time for translatable date or time formats. A translation comment can be added as an XML comment immediately above the <default> element — it is recommended to add these comments to aid translators understand the meaning and implications of the default value. An optional translation context attribute can be set on the <default> element to disambiguate multiple defaults which use the same string.
For example:
 <!-- Translators: A list of words which are not allowed to be typed, in
      GVariant serialization syntax.
      See: https://developer.gnome.org/glib/stable/gvariant-text.html -->
<default l10n='messages' context='Banned words'>['bad', 'words']</default>
Translations of default values must remain syntactically valid serialized #GVariants (e.g. retaining any surrounding quotation marks) or runtime errors will occur.
GSettings uses schemas in a compact binary form that is created by the [glib-compile-schemas][glib-compile-schemas] utility. The input is a schema description in an XML format.
A DTD for the gschema XML format can be found here: gschema.dtd
The [glib-compile-schemas][glib-compile-schemas] tool expects schema files to have the extension .gschema.xml.
At runtime, schemas are identified by their id (as specified in the id attribute of the <schema> element). The convention for schema ids is to use a dotted name, similar in style to a D-Bus bus name, e.g. "org.gnome.SessionManager". In particular, if the settings are for a specific service that owns a D-Bus bus name, the D-Bus bus name and schema id should match. For schemas which deal with settings not associated with one named application, the id should not use StudlyCaps, e.g. "org.gnome.font-rendering".
In addition to #GVariant types, keys can have types that have enumerated types. These can be described by a <choice>, <enum> or <flags> element, as seen in the [example][schema-enumerated]. The underlying type of such a key is string, but you can use g_settings_get_enum(), g_settings_set_enum(), g_settings_get_flags(), g_settings_set_flags() access the numeric values corresponding to the string value of enum and flags keys.
An example for default value:
<schemalist>
<schema id="org.gtk.Test" path="/org/gtk/Test/" gettext-domain="test">

    <key name="greeting" type="s">
      <default l10n="messages">"Hello, earthlings"</default>
      <summary>A greeting</summary>
      <description>
        Greeting of the invading martians
      </description>
    </key>

    <key name="box" type="(ii)">
      <default>(20,30)</default>
    </key>

    <key name="empty-string" type="s">
      <default>""</default>
      <summary>Empty strings have to be provided in GVariant form</summary>
    </key>

  </schema>
</schemalist>
An example for ranges, choices and enumerated types:
<schemalist>

  <enum id="org.gtk.Test.myenum">
    <value nick="first" value="1"/>
    <value nick="second" value="2"/>
  </enum>

  <flags id="org.gtk.Test.myflags">
    <value nick="flag1" value="1"/>
    <value nick="flag2" value="2"/>
    <value nick="flag3" value="4"/>
  </flags>

  <schema id="org.gtk.Test">

    <key name="key-with-range" type="i">
      <range min="1" max="100"/>
      <default>10</default>
    </key>

    <key name="key-with-choices" type="s">
      <choices>
        <choice value='Elisabeth'/>
        <choice value='Annabeth'/>
        <choice value='Joe'/>
      </choices>
      <aliases>
        <alias value='Anna' target='Annabeth'/>
        <alias value='Beth' target='Elisabeth'/>
      </aliases>
      <default>'Joe'</default>
    </key>

    <key name='enumerated-key' enum='org.gtk.Test.myenum'>
      <default>'first'</default>
    </key>

    <key name='flags-key' flags='org.gtk.Test.myflags'>
      <default>["flag1","flag2"]</default>
    </key>
  </schema>
</schemalist>
Vendor overrides
Default values are defined in the schemas that get installed by an application. Sometimes, it is necessary for a vendor or distributor to adjust these defaults. Since patching the XML source for the schema is inconvenient and error-prone, [glib-compile-schemas][glib-compile-schemas] reads so-called vendor override' files. These are keyfiles in the same directory as the XML schema sources which can override default values. The schema id serves as the group name in the key file, and the values are expected in serialized GVariant form, as in the following example:
    [org.gtk.Example]
    key1='string'
    key2=1.5
glib-compile-schemas expects schema files to have the extension .gschema.override.
Binding
A very convenient feature of GSettings lets you bind #GObject properties directly to settings, using g_settings_bind(). Once a GObject property has been bound to a setting, changes on either side are automatically propagated to the other side. GSettings handles details like mapping between GObject and GVariant types, and preventing infinite cycles.
This makes it very easy to hook up a preferences dialog to the underlying settings. To make this even more convenient, GSettings looks for a boolean property with the name "sensitivity" and automatically binds it to the writability of the bound setting. If this 'magic' gets in the way, it can be suppressed with the %G_SETTINGS_BIND_NO_SENSITIVITY flag.
Relocatable schemas # {#gsettings-relocatable}
A relocatable schema is one with no path attribute specified on its <schema> element. By using g_settings_new_with_path(), a #GSettings object can be instantiated for a relocatable schema, assigning a path to the instance. Paths passed to g_settings_new_with_path() will typically be constructed dynamically from a constant prefix plus some form of instance identifier; but they must still be valid GSettings paths. Paths could also be constant and used with a globally installed schema originating from a dependency library.
For example, a relocatable schema could be used to store geometry information for different windows in an application. If the schema ID was org.foo.MyApp.Window, it could be instantiated for paths /org/foo/MyApp/main/, /org/foo/MyApp/document-1/, /org/foo/MyApp/document-2/, etc. If any of the paths are well-known they can be specified as <child> elements in the parent schema, e.g.:
<schema id="org.foo.MyApp" path="/org/foo/MyApp/">
  <child name="main" schema="org.foo.MyApp.Window"/>
</schema>
Build system integration # {#gsettings-build-system}
GSettings comes with autotools integration to simplify compiling and installing schemas. To add GSettings support to an application, add the following to your configure.ac:
GLIB_GSETTINGS
In the appropriate Makefile.am, use the following snippet to compile and install the named schema:
gsettings_SCHEMAS = org.foo.MyApp.gschema.xml
EXTRA_DIST = $(gsettings_SCHEMAS)

`GSETTINGS_RULES@`
No changes are needed to the build system to mark a schema XML file for translation. Assuming it sets the gettext-domain attribute, a schema may be marked for translation by adding it to POTFILES.in, assuming gettext 0.19 is in use (the preferred method for translation):
data/org.foo.MyApp.gschema.xml
Alternatively, if intltool 0.50.1 is in use:
[type: gettext/gsettings]data/org.foo.MyApp.gschema.xml
GSettings will use gettext to look up translations for the <summary> and <description> elements, and also any <default> elements which have a l10n attribute set. Translations must not be included in the .gschema.xml file by the build system, for example by using intltool XML rules with a .gschema.xml.in template.
If an enumerated type defined in a C header file is to be used in a GSettings schema, it can either be defined manually using an <enum> element in the schema XML, or it can be extracted automatically from the C header. This approach is preferred, as it ensures the two representations are always synchronised. To do so, add the following to the relevant Makefile.am:
gsettings_ENUM_NAMESPACE = org.foo.MyApp
gsettings_ENUM_FILES = my-app-enums.h my-app-misc.h
gsettings_ENUM_NAMESPACE specifies the schema namespace for the enum files, which are specified in gsettings_ENUM_FILES. This will generate a org.foo.MyApp.enums.xml file containing the extracted enums, which will be automatically included in the schema compilation, install and uninstall rules. It should not be committed to version control or included in EXTRA_DIST.