let wakeLock = null;
const WAKE_LOCK_TYPE = 'screen';

var id_mod_app = "M0000"
var id_tipo_elemento = "comp"
var dtcalendario
var dtdesignaciones
var dtagenda
var holdTimer
var intervalTimer
const partConectados=[]
const hubProxy = $.connection.enDirecto;
$(function () {
    // Accede al proxy del hub `enDirecto`
    //const hubProxy = $.connection.enDirecto;

    // Verifica que el proxy del hub esté disponible
    if (hubProxy) {
        // Define el método de cliente que el servidor puede llamar
        hubProxy.client.anunciarCambios = function (data) {
            console.log("Datos recibidos:", data);
        };
        hubProxy.client.marcadorPartido = function (resultados, idpartido) {
            console.log("Actualizo marcador")
            console.log(resultados)
            procesarMarcadorPartido(resultados, idpartido)
        };
        hubProxy.client.eventosPartido = function (resultados, idpartido) {
            console.log("eventospartido")
            procesarEventosPartido(resultados, idpartido)
        };
        hubProxy.client.penaltisPartido = function (resultados, idpartido) {
            console.log("Actualizo penaltis");
            procesarPenaltisPartido(resultados, idpartido)
        };
        hubProxy.client.alineacionPartido = function (resultados, idpartido) {
            console.log("Alineacion partido")
            procesarAlinPartido(resultados, idpartido)
        };
        hubProxy.client.cronoPartido = function (resultados, idpartido) {
            console.log("Crono partido")
            procesarCronoPartido(resultados, idpartido)
        };
        hubProxy.client.recibirEventosIniciales = function (datosActuales,idpartido) {
            console.log("Eventos iniciales del partido " + idpartido + " recibidos");
            procesarEventosPartido(datosActuales, idpartido)
        };
        hubProxy.client.recibirPenaltisIniciales = function (datosActuales, idpartido) {
            console.log("Penaltis iniciales del partido " + idpartido + " recibidos");
            procesarPenaltisPartido(datosActuales, idpartido)
        };
        hubProxy.client.recibirAlinIniciales = function (datosActuales, idpartido) {
            console.log("Alineaciones iniciales partido " + idpartido + " recibidas");
            procesarAlinPartido(datosActuales, idpartido)
        };
        hubProxy.client.recibirMarcadorPartido = function (resultados, idpartido) {
            console.log("Actualizo marcador partido " + idpartido)
            procesarMarcadorPartido(resultados, idpartido)
        };
        // Establece la URL y conecta al servidor
        const currentUrl = window.location.href;

        // Verificar si la URL contiene "ns.digitalsport.online"
        const signalrUrl = currentUrl.includes("digitalsport.online")
            ? "https://ns.digitalsport.online/signalr"
            : "https://digitalsport.online/signalr";
        $.connection.hub.url = signalrUrl;
        console.log(signalrUrl)
        function iniciarConexion() {
            $.connection.hub.start()
                .done(() => { console.log("Conectado a Servidor"); unirseAModalidad() })
                .fail(err => {
                    console.error("Error al conectar al Servidor:", err);
                    intentarReconectar();
                });
        }
        // Función para intentar reconectar
        function intentarReconectar() {
            console.log("Intentando reconectar en 5 segundos...");
            setTimeout(() => {
                iniciarConexion();
            }, 5000); // Intentar reconectar cada 5 segundos
        }
        // Configura eventos de conexión y desconexión
        $.connection.hub.disconnected(() => {
            console.warn("Conexión perdida. Intentando reconectar...");
            intentarReconectar();
        });

        $.connection.hub.reconnecting(() => {
            console.log("Intentando reconectar...");
        });
        // Reunirse a los grupos después de reconectar
        $.connection.hub.reconnected(() => {
            console.log("Reconectado al servidor. Intentando volver a unirse a los partidos...");
            partConectados.forEach(idpartido => {
                unirseAPartido(idpartido, ""); // Reunirse al grupo
                unirseAModalidad()
            });
        });
        iniciarConexion();
    } else {
        console.error("El hub 'enDirecto' no está definido. Verifica el nombre en /signalr/hubs.");
    }
});
async function requestWakeLock() {
    if ('wakeLock' in navigator && wakeLock === null) {
        try {
            wakeLock = await navigator.wakeLock.request(WAKE_LOCK_TYPE);
            console.log('Bloqueo de pantalla activado para actualizaciones en directo.');

            // Escucha si el sistema libera el bloqueo (p. ej., el navegador pierde el foco)
            wakeLock.addEventListener('release', () => {
                console.log('Bloqueo de pantalla liberado por el sistema.');
                wakeLock = null; // Reinicia la variable para poder solicitarlo de nuevo
            });

        } catch (err) {
            console.error(`Error al solicitar el bloqueo: ${err.name}, ${err.message}`);
        }
    }
}

$(document).ready(function () {
    $('.btn-comp-opcion').on("click", function () {
        $('.btn-comp-opcion').removeClass("active")
        $(this).addClass("active")
        var seccion = $(this).data("seccion")
        requestWakeLock()
        switch (seccion) {
            case "web":
                window.location.href = "/"
                break;
            case "hp":
                window.location.href="/competicion/hp"
                break;
            case "hl":
                window.location.href = "/competicion/hl"
                break;
            case "agenda":
                window.location.href = "/competicion/agenda"
                
                break;
        }
    })
})
window.addEventListener('load', function () {

});
function inicio() {
    
    var modalidad = $('#prmIdModalidad').val()
    $('.logocabeceracomp').css("background-image", "url(/images/header_fvp_" + modalidad + ".jpg?v=4)")
    switch (modalidad) {
        case "hp":
            $('.btn-comp-opcion[data-seccion=hp]').addClass("active")
            cargarTemporadas()
            cargarMarcadores()
            cargarMarcadoresNacionales()
            $('.lblModalidad').text(i18next.t("HockeyPatines"))
            break;
        case "hl":
            $('.btn-comp-opcion[data-seccion=hl]').addClass("active")
            cargarTemporadas()
            cargarMarcadores()
            cargarMarcadoresNacionales()
            $('.lblModalidad').text(i18next.t("HockeyLinea"))
            break;
        case "agenda":
            $('.btn-comp-opcion[data-seccion=agenda]').addClass("active")
            $('.tab-partidos').hide()
            cargarEquiposDesplegable()
            break;
    }
}
function cargarTemporadas() {
    var modalidad = $('#prmIdModalidad').val()
    var parametros = {
        modalidad: modalidad
    };
    parametros = JSON.stringify(parametros);
    $(function () {
        $.ajax({
            type: "POST",
            url: "/webservices/WSCompeticiones.asmx/GetTemporadasCompeticion",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: parametros,
            success: function success(response) {
                try {
                    /*Si el JSON está mal formado se generará una excepción */
                    var info = response;
                    if (info.error == true) {
                        /* Si hemos enviado por JSON un error, lo notificamos */
                        Console.log('Error detectado:', info);
                        return;
                    }
                    $('#ddlTemporadaComp').empty()
                    $('#ddlTemporadaComp').off()
                    //$('#ddlTemporadaComp').append("<option value=''>" + i18next.t("Escoja") + "</option>")
                    var datosform = response.d;
                    var tempactiva = ""
                    if (datosform != "") {
                        var obj = $.parseJSON(datosform)
                        $(obj).each(function () {
                            var idtempcomp = this.IdTempComp;
                            var temporada = this.Temporada;
                            var actual = this.Actual;
                            if (actual) {
                                tempactiva = idtempcomp
                            }
                            $('#ddlTemporadaComp').append("<option class='text-center' value='" + idtempcomp + "'>" + temporada + "</option>")
                        });
                    }
                    $('#ddlTemporadaComp').val(tempactiva).change()
                                           
                        cargarCompeticiones()
                    
                    $('#ddlTemporadaComp').on("change", function () {
                        cargarCompeticiones()
                    })
                } catch (error) {
                    /* Si el JSON está mal, notificamos su contenido */
                    console.log('ERROR. Recibido:' + error, response);
                }
            },
            /* En caso de error XHR mostramos el error (pasará los parámetros a console.log) */
            Error: function error(_error) {
                console.log(JSON.stringify(_error));
            }
        });
    });
}
//AGENDA
function cargarEquiposDesplegable() {
    $.ajax({
        type: "POST",
        url: "/webservices/WSCompeticiones.asmx/GetClubesCompeticiones",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function success(response) {
            try {
                /*Si el JSON está mal formado se generará una excepción */
                var info = response;
                var datos = response.d;
                $('#ddlClub').empty()
                $('#ddlClub').append("<option class='text-center text-uppercase' value='0'>" + i18next.t("Todos") + "</option>")
                if (datos != "") {
                    var obj = $.parseJSON(datos)
                    $(obj).each(function () {
                        var identidadequipo = this.IdEntidadEquipo;
                        var denoabreviada = this.DenoAbreviada;
                        $('#ddlClub').append("<option class='text-center' value='" + identidadequipo + "'>" + denoabreviada + "</option>")
                    })
                }
                var idclub = Cookies.get("agendaclub")
                if (idclub === undefined) {
                    idclub = "0"
                }
                var modalidad = Cookies.get("agendamodalidad")
                if (modalidad === undefined) {
                    modalidad = '%'
                }
                var dias = Cookies.get("agendadias")
                if (dias === undefined) {
                    dias = 7
                }
                $('#ddlClub').val(idclub).change()
                $('#ddlModalidadAgenda').val(modalidad).change()
                $('#ddlDiasAgenda').val(dias).change()

                $('#ddlClub').on("change", function () {
                    cargarAgenda()
                    var idclub = $('#ddlClub').val()
                    $('.btnGuardarEntidad').show()
                })
                $('#ddlModalidadAgenda').on("change", function () {
                    cargarAgenda()
                    var modalidad = $('#ddlModalidadAgenda').val()
                    $('.btnGuardarModalidad').show()
                })
                $('#ddlDiasAgenda').on("change", function () {
                    cargarAgenda()
                    $('.btnGuardarDias').show()
                })
                $('#ddlClub').select2({
                    width: '65%'
                })
                $('#ddlModalidadAgenda').select2({
                    width: '65%'
                })
                $('#ddlDiasAgenda').select2({
                    width: '65%'
                })
                cargarAgenda()
                $('.btnGuardarEntidad').on("click", function () {
                    $('.btnGuardarEntidad').hide()
                    var idclub = $('#ddlClub').val()
                    Cookies.set("agendaclub", idclub, { expires: 365 })
                    toastr.success(i18next.t("SeleccionGuardada"), "Info")
                })
                $('.btnGuardarModalidad').on("click", function () {
                    $('.btnGuardarModalidad').hide()
                    var modalidad = $('#ddlModalidadAgenda').val()
                    Cookies.set("agendamodalidad", modalidad, { expires: 365 })
                    toastr.success(i18next.t("SeleccionGuardada"), "Info")
                })
                $('.btnGuardarDias').on("click", function () {
                    $('.btnGuardarDias').hide()
                    var dias = $('#ddlDiasAgenda').val()
                    Cookies.set("agendadias", dias, { expires: 365 })
                    toastr.success(i18next.t("SeleccionGuardada"), "Info")
                })
                if (info.error == true) {
                    /* Si hemos enviado por JSON un error, lo notificamos */
                    console.log('Error detectado:', info);
                    return;
                }
            } catch (error) {
                /* Si el JSON está mal, notificamos su contenido */
                console.log('ERROR. Recibido:' + error, response);

            }
        },
        /* En caso de error XHR mostramos el error (pasará los parámetros a console.log) */
        error: function error(_error) {
            console.log(JSON.stringify(_error));
        }
    });
}
function cargarAgenda() {
    $('.secciones').hide()
    $('#secAgenda').show()
    $('.tblAgendaDatos').block(blockOpt())
    if (dtagenda != undefined) {
        dtagenda.destroy()
    }
    var identidadclub = $('#ddlClub').val()
    var html=""
    var modalidad = $('#ddlModalidadAgenda').val()
    var dias = $('#ddlDiasAgenda').val()
    var parametros = {
        modalidad: modalidad,
        dias: dias,
        identidadclub:identidadclub
    };
    parametros = JSON.stringify(parametros);
    $(function () {
        $.ajax({
            type: "POST",
            url: "/webservices/WSCompeticiones.asmx/GetAgendaPartidos",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: parametros,
            success: function success(response) {
                try {
                    /*Si el JSON está mal formado se generará una excepción */
                    var info = response;
                    if (info.error == true) {
                        /* Si hemos enviado por JSON un error, lo notificamos */
                        Console.log('Error detectado:', info);
                        $('.tblAgendaDatos').unblock()
                        return;
                    }
                    var datosform = response.d;
                    if (datosform != "") {
                        var partidos = $.parseJSON(datosform, (key, value) => value === null ? "" : value);
                        $(partidos).each(function () {
                            var coordenadasGPS = this.CoordenadasGPS;
                            var denocomp = this.DenoComp;
                            var locale = $('html').attr("lang")
                            var fecha = moment(this.Fecha).locale(locale).format("dddd - DD/MM/YYYY").toUpperCase();
                            var hora = this.Hora;
                            if (hora != "") {
                                hora = '-' + moment(hora, "HH:mm:ss").format("HH:mm")
                            }
                            var fechahora = moment(this.Fecha).format("DD/MM/YYYY") + hora
                            var idmodalidadcomp = this.IdModalidadComp;
                            var colormodalidad = "primary"
                            if (idmodalidadcomp == "hl") {
                                colormodalidad="secondary"
                            }
                            var nombrejornada = this.NombreJornada;
                            var orden = this.Orden;
                            if (nombrejornada == "") {
                                nombrejornada = i18next.t("Jornada", { ns: "comp" }) + " " + orden
                            }
                            var idequipolocal = this.IdEquipoLocal;
                            var idequipovisit = this.IdEquipoVisit;
                            var puntobonus = this.PuntoBonus;
                            var bonuslocal = "<i style='color:transparent;' class='fa fa-award me-2'></i>"
                            var bonusvisit = "<i style='color:transparent;' class='fa fa-award ms-2'></i>"
                            if (puntobonus == idequipolocal) {
                                bonuslocal = "<i style='color:var(--primary);' class='fa fa-award me-2'></i>"
                            }
                            if (puntobonus == idequipovisit) {
                                bonusvisit = "<i style='color:var(--primary);' class='fa fa-award ms-2'></i>"
                            }
                            var equipolocal = this.Eq1;
                            var equipovisit = this.Eq2;
                            var goleslocal = this.GolesLocal;
                            var golesvisit = this.GolesVisit;
                            var urlvideo = this.UrlVideo;
                            var resultado = "-"
                            if ((goleslocal !== null && goleslocal !== undefined && goleslocal !== "") &&
                                (golesvisit !== null && golesvisit !== undefined && golesvisit !== "")) {
                                resultado = goleslocal + ' - ' + golesvisit;
                            }
                            var instalacion = this.Instalacion;
                            if (instalacion == "") {
                                instalacion = i18next.t("SinPistaAsignada")
                            }
                            if (coordenadasGPS != "") {
                                instalacion = `<a href="javascript:void(0)"  onclick="comoLlegar('${coordenadasGPS}')" style="font-size:smaller;" class="text-bold-600 datopartido_tbl">${instalacion}</a>`
                            } else {
                                instalacion = `<span style="font-size:smaller;" class="datopartido_tbl">${instalacion}</span>`
                            }
                            var template = `<tr>
                                                <td class="d-none"><span class="ms-2 text-white">${fecha}</span></td>
                                                <td class="text-center" style="width:40px;"><span class="badge badge-sm badge-${colormodalidad} text-uppercase">${idmodalidadcomp}</span></td>
                                                <td class="text-center" style="width:120px;"><span class="">${fechahora}</td>
                                                <td class="text-center"><span class="">${denocomp}</td>
                                                <td><span>${equipolocal}</span></td>
                                                <td><span>${equipovisit}</span></td>
                                                <td class="text-center" style="width:80px;"><span>${bonuslocal}${resultado}${bonusvisit}</span></td>
                                                <td class="text-center d-none" style="width:20px;"><i class="fa-sharp fa-light fa-file-invoice"></i></td>
                                                <td class="text-center d-none" style="width:20px;" style="width:20px;"><i class="fa-regular fa-screen-users"></i></td>
                                                <td>${instalacion}</td>
                                            </tr>`
                            html += template
                        });
                    } else {
                        
                    }
                    $('.tblAgendaDatos').html(html)
                    dtagenda = $('#tblAgenda').DataTable({
                        //"oLanguage": {
                        //    "sUrl": idiomaDT()
                        //},
                        "dom": "<'row'<'col-sm-12'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12'>>",
                        "rowId": "id",
                        "pageLength": -1,
                        "responsive": false,
                        /*                            "lengthMenu": [[25, 50, 100], [25, 50, 100]],*/
                        "stateSave": false,
                        "ordering": false,
                        initComplete: function () {
                            //dtcalendario.columns.adjust();
                            $("#tblAgenda").wrap("<div style='overflow:auto; width:100%;position:relative;'></div>");
                            $('.tblAgendaDatos').unblock()
                        },
                        "drawCallback": function (settings) {
                            var api = this.api();
                            var rows = api.rows({ page: 'current' }).nodes();
                            var last = null
                            api.column(0, { page: 'current' }).data().each(function (group, i) {
                                if (last !== group) {
                                    $(rows).eq(i).before(
                                        '<tr class="bg-primary"><td colspan="7" style="padding:4px;font-weight:600;">' + group + '</td></tr>'
                                    );
                                    last = group;
                                }
                            })
                        }
                    });
                    $('.tblAgendaDatos').unblock()
                } catch (error) {
                    /* Si el JSON está mal, notificamos su contenido */
                    console.log('ERROR. Recibido:' + error, response);
                    $('.tblAgendaDatos').unblock()
                }
            },
            /* En caso de error XHR mostramos el error (pasará los parámetros a console.log) */
            Error: function error(_error) {
                console.log(JSON.stringify(_error));
                $('.tblAgendaDatos').unblock()
            }
        });
    });
}
//COMPETICIONES
function cargarCompeticiones() {
    var modalidad = $('#prmIdModalidad').val()
    
    $('.secciones').hide()
    $('#secCompeticiones').show()
    $('.listadocompeticiones').html("")
    $('.listadocompeticiones').block(blockOpt())
    var modalidad = $('#prmIdModalidad').val()
    var temporada = $('#ddlTemporadaComp').val()
    var parametros = {
        modalidad: modalidad,
        temporada:temporada
    };
    parametros = JSON.stringify(parametros);
    $(function () {
        $.ajax({
            type: "POST",
            url: "/webservices/WSCompeticiones.asmx/GetCompeticiones",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: parametros,
            success: function success(response) {
                try {
                    /*Si el JSON está mal formado se generará una excepción */
                    var info = response;
                    if (info.error == true) {
                        /* Si hemos enviado por JSON un error, lo notificamos */
                        Console.log('Error detectado:', info);
                        return;
                    }
                    var datosform = response.d;
                    if (datosform != "") {
                        var obj = $.parseJSON(datosform)
                        var version = Date.now()
                        $(obj).each(function () {
                            var idcompeticion = this.IdCompeticion;
                            var identidad = this.IdEntidad
                            var denocompeticion = this.DenoComp;
                            var logocomp = this.LogoComp;
                            var equipos = this.Equipos;
                            var logocompeticion = ""
                            var generos = ""
                            if (logocomp) {
                                logocompeticion = `<img id="logocomp" src="https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/logocompeticion/400x400/${idcompeticion}.jpg?v=${version}"  style="width:90px;height:auto;" class="" alt="">`
                            } else {
                                logocompeticion = `<img src="https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/200x200/${identidad}.png?v=${version}" style="width:90px;height:auto;" alt="">`
                            }
                            var logosequipos = ""
                            if (equipos.length > 0 && Object.keys(equipos[0]).length > 0) {
                                $(equipos).each(function () {
                                    if (this.TieneLogo) {
                                        var idequipo = this.IdEquipo
                                        logosequipos += `<img src="https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/200x200/${idequipo}.png" style="width:32px;height:auto;" alt="">`
                                    } else {
                                        logosequipos += `<img src="https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/200x200/sinescudo.png" style="width:32px;height:auto;" alt="">`
                                    }
                                })
                            }
                            var template = `<div class="divCompeticion p-1 col-12" onclick="openCompeticion(this);" idcompeticion="${idcompeticion}" >
                                                <div class="divComp">
                                                    <div class="logocompeticion pe-2" style="float:left;">
                                                        ${logocompeticion}
                                                    </div
                                                    <div class="datoscompeticion" style="float:left;">
                                                        <div class="w-100 text-uppercase fw-bold text-black">${denocompeticion}</div>
                                                        <div class="w-100 px-3">${logosequipos}</div>
                                                    </div>
                                                </div>
                                            </div>`
                            $('.listadocompeticiones').append(template)
                        });
                        
                    } else {
                        $('.listadocompeticiones').append("NO HAY COMPETICIONES")
                    }
                    $('.listadocompeticiones').unblock()

                } catch (error) {
                    /* Si el JSON está mal, notificamos su contenido */
                    console.log('ERROR. Recibido:' + error, response);
                    $('.listadocompeticiones').unblock()
                }
            },
            /* En caso de error XHR mostramos el error (pasará los parámetros a console.log) */
            Error: function error(_error) {
                console.log(JSON.stringify(_error));
                $('.listadocompeticiones').unblock()
            }
        });
    });
}
function closeCompeticion() {
    $('#secCompeticiones').show();
    $('#secCompeticion').hide();
}
function openCompeticion(lnk) {
    document.getElementById('header').scrollIntoView({
        behavior: 'smooth', // Hace que el scroll sea suave
        block: 'start' // Alinea la parte superior del elemento con la parte superior del viewport
    });
    var idcompeticion = $(lnk).attr("idcompeticion")
    $('#txtIdCompeticion').val(idcompeticion)
    estadisticasCompeticion()
    $('.tabs-competicion').block(blockOpt())
    $('#secCompeticiones').hide();
    $('#secCompeticion').show();
    //$('.secCompeticion .parametros').html("")
    $('#secCompeticion .competicion').html("")
    $('#secCompeticion .parametros').block(blockOpt())
    $('.opcionCompeticion').removeClass("active")
    $('.opcionCompeticion.calendario').addClass("active")

    $('.tab-competicion .tab-pane').removeClass("active")
    $('#calendario').addClass("active")
    //cargarCalendario()
    var parametros = {
        idcompeticion: idcompeticion
    };
    parametros = JSON.stringify(parametros);
    $(function () {
        $.ajax({
            type: "POST",
            url: "/webservices/WSCompeticiones.asmx/GetParametrosCompeticion",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: parametros,
            success: function success(response) {
                try {
                    /*Si el JSON está mal formado se generará una excepción */
                    var info = response;
                    if (info.error == true) {
                        /* Si hemos enviado por JSON un error, lo notificamos */
                        Console.log('Error detectado:', info);
                        return;
                    }
                    var datosform = response.d;
                    if (datosform != "") {
                        var obj = $.parseJSON(datosform)
                        console.log(1,obj)
                        var version = Date.now()
                        $(obj).each(function () {
                            var idcompeticion = this.IdCompeticion;
                            var identidad = this.IdEntidad
                            var denocompeticion = this.DenoComp;
                            var logocomp = this.LogoComp;
                            var equipos = this.Equipos;
                            var logocompeticion = ""
                            var generos = ""
                            var temporada = this.Temporada;
                            var designaciones = this.Designaciones;
                            var estadisticas = this.Estadisticas;
                            var pistasjuego = this.PistasJuego;
                            var clasificacion = this.Clasificacion;
                            var plantillas = this.Plantillas;
                            var resultadosyclasificacion = this.ResultadosYClasificacion;
                            $('.tab-calendario').attr("resultadoyclasificacion", resultadosyclasificacion)
                            if (clasificacion && !resultadosyclasificacion) {
                                $('.tab-clasificacion').show()
                            } else {
                                $('.tab-clasificacion').hide()
                            }
                            if (designaciones) {
                                $('.tab-designaciones').show()
                            } else {
                                $('.tab-designaciones').hide()
                            }
                            if (estadisticas) {
                                $('.tab-estadisticas').show()
                            } else {
                                $('.tab-estadisticas').hide()
                            }
                            if (plantillas) {
                                $('.tab-plantillas').show()
                            } else {
                                $('.tab-plantillas').hide()
                            }
                            
                            //TEMPORAL>>>>>
                            //$('.tab-clasificacion').hide()
                            $('.tab-plantillas').hide()
                            //TEMPORAL<<<<<
                            if (logocomp) {
                                logocompeticion = `<img src="https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/logocompeticion/400x400/${idcompeticion}.jpg"  style="width:180px;height:auto;" class="" alt="">`
                            } else {
                                logocompeticion = `<img src="https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/200x200/${identidad}.png" style="width:180px;height:auto;" alt="">`
                            }
                            $('#logocompeticion').html(logocompeticion)
                            var titulocompeticion = `<span class="text-uppercase fw-bold ps-2">${denocompeticion}</span><span class="ms-1 fs-5" style="font-weight:300;">(${temporada})</span>`
                            $('.titulocompeticion').html(titulocompeticion)
                            var logosequipos = ""
                            if (equipos.length > 0 && Object.keys(equipos[0]).length > 0) {
                                $(equipos).each(function () {
                                    var identidad = this.IdEntidadEquipo
                                    var idequipocomp=this.IdEquipoComp
                                    var logoequipo = ""
                                    var nombreequipoabrev = this.NombreEquipoAbrev;
                                    if (this.TieneLogo) {
                                        logoequipo = `https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/36x36/${identidad}.png`
                                    } else {
                                        logoequipo = `https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/36x36/sinescudo.png`
                                    }
                                    var template = `<div class="logo_equipo_menu_container fltEquipo" onclick="filtrarEquipo(this)" data-idequipo="${idequipocomp}">
					                            	    <div class="logo_equipo_menu_logo"><img src="${logoequipo}" width="35"></div>
                                					    <div class="logo_equipo_menu_nombre">${nombreequipoabrev}</div>
				                                    </div>`
                                                logosequipos+=template
                                })
                            }
                            $('#filtroEquipos').html(logosequipos)
                        });
                        $('#secCompeticion .parametros').unblock()
                        $('.tabs-competicion').unblock()
                    }
                    $('.opcionCompeticion.calendario').click()
                } catch (error) {
                    /* Si el JSON está mal, notificamos su contenido */
                    console.log('ERROR. Recibido:' + error, response);
                    $('#secCompeticion .parametros').unblock()
                }
            },
            /* En caso de error XHR mostramos el error (pasará los parámetros a console.log) */
            Error: function error(_error) {
                console.log(JSON.stringify(_error));
                $('#secCompeticion .parametros').unblock()
            }
        });
    });
}
function cargarCalendario() {
    //$('.tblCalendarioDatos').html("")
    $('#calendario').html("")
    $('#calendario').block(blockOpt())
        var idcompeticion = $('#txtIdCompeticion').val()
        var html = ""
        var idequipocomp = "%"
        if ($('.fltEquipo.active').length != 0) {
            idequipocomp = $('.fltEquipo.active').data("idequipo")
        }
        var parametros = {
            idcompeticion: idcompeticion,
            idequipocomp:idequipocomp
        };
        parametros = JSON.stringify(parametros);
        $(function () {
            $.ajax({
                type: "POST",
                url: "/webservices/WSCompeticiones.asmx/GetCalendarioCompeticion",
                data: parametros,
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: function success(response) {
                    try {
                        /*Si el JSON está mal formado se generará una excepción */
                        var info = response;
                        var competiciones = response.d;
                        var idjornadacompprev=0
                        if (competiciones !== "") {
                            competiciones = $.parseJSON(competiciones, (key, value) => value === null ? "" : value);
                            console.log("competiciones", competiciones)
                            let agregartitulo=0
                            if (competiciones.length > 1) {
                                agregartitulo=1
                            }
                            $(competiciones).each(function () {
                                var idcompeticion = this.IdCompeticion;
                                var idcompfase = this.IdCompFase;
                                var denofase = this.DenoFase;
                                let titulo = "";
                                if (agregartitulo == 1) {
                                    titulo =`<div style="margin-bottom: 10px;margin-top: 20px;margin-left: 20px;font-size: 1.5em;font-weight: 700;">${denofase}</div>`
                                }
                                var partidos = this.Partidos;
                                    var tblCalendario = `${titulo}<div class="col-12" id="clasificacion_${idcompeticion}"></div>
                                <div class="col-12">
                                    <div class="ds-table-container scroll-table">
                                        <table class="table mb-0 table-hover nowrap font-small-3 custom-table tblCalendario" id="tblCalendario_${idcompeticion}" style="width: 100%;">
                                            <thead>
                                                <tr class="bg-dark white d-none">
                                                    <th>IdJornada</th>
                                                    <th>FechaJornada</th>
                                                    <th>Fecha</th>
                                                    <th>EquipoLocal</th>
                                                    <th>EquipoVisitante</th>
                                                    <th>Resultado</th>
                                                    <th>Directo</th>
                                                    <th class="d-none">ActaPdf</th>
                                                    <th class="d-none">ActaDig</th>
                                                    <th>Instalacion</th>
                                                    <th><i class="fa fa-video"></i></th>
                                                </tr>
                                            </thead>
                                            <tbody class="tblCalendarioDatos_${idcompeticion} cursor-pointer"></tbody>
                                        </table>
                                    </div>
                                </div>`;
                                $('#calendario').append(tblCalendario);
                                if ($('.tab-calendario[resultadoyclasificacion=true]').length != 0) {
                                    cargarClasificacion(idcompeticion)
                                } else {
                                    console.log("no cargamos clasificaciones")
                                }
                                    idcompeticionprev = idcompeticion;
                                

                                var html = "";
                                

                                // Verificar si `Partidos` existe y es un array
                                if (Array.isArray(partidos) && partidos.length > 0) {
                                    $(partidos).each(function () {
                                        var idpartido = this.IdPartido;
                                        var mostrarpartido = idpartido ? "" : "d-none";
                                        var coordenadasGPS = this.CoordenadasGPS;
                                        var idjornadacomp = this.IdJornadaComp;
                                        var fechajornada = this.FechaJornada ? " - " + moment(this.FechaJornada).format("DD/MM/YYYY") : "";
                                        var nombrejornada = this.NombreJornada || i18next.t("Jornada", { ns: "comp" }) + " " + this.Orden;

                                        // JORNADAS
                                        if (idjornadacompprev !== idjornadacomp) {
                                            html += `<tr class="bg-primary">
                                                <td colspan="7">
                                                    <span class="ms-2 text-white">${nombrejornada}${fechajornada}</span>
                                                </td>
                                            </tr>`;
                                            idjornadacompprev = idjornadacomp;
                                        }

                                        var eq1 = this.Eq1;
                                        var eq2 = this.Eq2;
                                        var fecha = this.Fecha ? moment(this.Fecha).format("DD/MM/YYYY") : "Fecha / Hora";
                                        var hora = this.Hora ? moment(this.Hora, "HH:mm:ss").format("HH:mm") : "";
                                        fecha = fecha + (hora ? '-' + hora : "");

                                        var idequipolocal = this.IdEquipoLocal;
                                        var idequipovisit = this.IdEquipoVisit;
                                        var puntobonus = this.PuntoBonus;
                                        var bonuslocal = puntobonus == idequipolocal ? "<i style='color:var(--primary);' class='fa fa-award me-2'></i>" : "<i style='color:transparent;' class='fa fa-award me-2'></i>";
                                        var bonusvisit = puntobonus == idequipovisit ? "<i style='color:var(--primary);' class='fa fa-award ms-2'></i>" : "<i style='color:transparent;' class='fa fa-award ms-2'></i>";

                                        var equipolocal = this.EquipoLocal;
                                        var equipovisit = this.EquipoVisit;
                                        var goleslocal = this.GolesLocal;
                                        var golesvisit = this.GolesVisit;
                                        var resultado = (goleslocal !== "" && golesvisit !== "") ? goleslocal + ' - ' + golesvisit : "-";

                                        var instalacion = this.Instalacion || i18next.t("SinPistaAsignada");
                                        if (coordenadasGPS !== "") {
                                            instalacion = `<a href="javascript:void(0)" onclick="event.stopPropagation();comoLlegar('${coordenadasGPS}')" style="font-size:smaller;" class="text-bold-600 datopartido_tbl">${instalacion}</a>`;
                                        } else {
                                            instalacion = `<span style="font-size:smaller;" class="datopartido_tbl">${instalacion}</span>`;
                                        }

                                        var urlvideo = this.UrlVideo;
                                        var plataformavideo = this.PlataformaVideo;
                                        var video = "";
                                        if (urlvideo !== "") {
                                            switch (plataformavideo) {
                                                case "YouTube":
                                                    urlvideo = "https://www.youtube.com/watch?v=" + urlvideo;
                                                    break;
                                                case "Vimeo":
                                                    urlvideo = "https://player.vimeo.com/video/" + urlvideo;
                                                    break;
                                            }
                                            video = `<a href="${urlvideo}" target="_blank" onclick="stopPropagation();"><i class="fa-sharp fa-regular fa-video"></i></a>`;
                                        }

                                        var estadoPartido = this.EstadoPartido;
                                        var template = `<tr id="${idpartido}" class="${mostrarpartido}" style="cursor:pointer;" onclick="abrirPartido('${idpartido}','${eq1}','${eq2}')">
                                    <td class="text-center" style="width:140px;"><span class="">${fecha}</span></td>
                                    <td style="width:8px;" id="${idpartido}_estado" class="estadopartido_${estadoPartido}"></td>
                                    <td style="text-align:right;"><span>${equipolocal}</span></td>
                                    <td class="text-center" style="width:80px;"><span>${bonuslocal}${resultado}${bonusvisit}</span></td>
                                    <td><span>${equipovisit}</span></td>
                                    <td>${instalacion}</td>
                                    <td class="text-center" style="width:20px;">${video}</td>
                                </tr>`;

                                        html += template;
                                    });
                                } else {
                                    console.warn(`No hay partidos en la competición ${idcompeticion}`);
                                }

                                $('.tblCalendarioDatos_' + idcompeticion).html(html);
                            });
                            
                        } else {
                            console.log("No hay datos disponibles.");
                        }

                        $('#calendario').unblock();

                        if (info.error === true) {
                            console.log('Error detectado:', info);
                        }


                    } catch (error) {
                        /* Si el JSON está mal, notificamos su contenido */
                        console.log('ERROR. Recibido:' + error, response);
                        toastr.error('ERROR. Recibido:' + error, "ERROR")
                        $('#calendario').unblock();
                    }
                },
                /* En caso de error XHR mostramos el error (pasará los parámetros a console.log) */
                error: function error(_error) {
                    console.log(JSON.stringify(_error));
                    $('#calendario').unblock();
                }
            });
        });
}
function cargarDesignaciones() {
    $('.tblDesignacionesDatos').html("")
    $('#designaciones').block(blockOpt())
    if (dtdesignaciones != undefined) {
        dtdesignaciones.destroy()
    }
    var idcompeticion = $('#txtIdCompeticion').val()
    var html = ""
    var idequipocomp = "%"
    if ($('.fltEquipo.active').length != 0) {
        idequipocomp = $('.fltEquipo.active').data("idequipo")
    }
    var parametros = {
        idcompeticion: idcompeticion,
        idequipocomp: idequipocomp
    };
    parametros = JSON.stringify(parametros);
    $(function () {
        $.ajax({
            type: "POST",
            url: "/webservices/WSCompeticiones.asmx/GetDesignacionesCompeticion",
            data: parametros,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function success(response) {
                try {
                    /*Si el JSON está mal formado se generará una excepción */
                    var info = response;
                    var partidos = response.d;
                    if (partidos != "") {
                        partidos = $.parseJSON(partidos, (key, value) => value === null ? "" : value);
                        $(partidos).each(function () {
                            var idpartido = this.IdPartido;
                            var mostrarpartido = ""
                            if (idpartido == "") {
                                mostrarpartido = "d-none"
                            }
                            var idjornadacomp = this.IdJornadaComp;
                            var fechajornada = this.FechaJornada;
                            if (fechajornada != "") {
                                fechajornada = " - " + moment(fechajornada).format("DD/MM/YYYY")
                            }
                            var fecha = this.Fecha;
                            var hora = this.Hora;
                            if (hora != "") {
                                hora = moment(hora, "HH:mm:ss").format("HH:mm")
                            }
                            if (fecha != "") {
                                fecha = moment(fecha).format("DD/MM/YYYY") + '</br>' + hora
                            } else {
                                fecha = "Fecha / Hora"
                            }
                            var nombrejornada = this.NombreJornada;
                            var orden = this.Orden;
                            if (nombrejornada == "") {
                                nombrejornada = i18next.t("Jornada", { ns: "comp" }) + " " + orden
                            }
                            var idequipolocal = this.IdEquipoLocal;
                            var idequipovisit = this.IdEquipoVisit;
                            var puntobonus = this.PuntoBonus;
                            var bonuslocal = "<i style='color:transparent;' class='fa fa-award me-2'></i>"
                            var bonusvisit = "<i style='color:transparent;' class='fa fa-award ms-2'></i>"
                            if (puntobonus == idequipolocal) {
                                bonuslocal = "<i style='color:var(--primary);' class='fa fa-award ms-2'></i>"
                            }
                            if (puntobonus == idequipovisit) {
                                bonusvisit = "<i style='color:var(--primary);' class='fa fa-award ms-2'></i>"
                            }
                            var equipolocal = this.EquipoLocal;
                            var equipovisit = this.EquipoVisit;
                            var goleslocal = this.GolesLocal;
                            var golesvisit = this.GolesVisit;
                            var resultado = "-"
                            if ((goleslocal !== null && goleslocal !== undefined && goleslocal !== "") &&
                                (golesvisit !== null && golesvisit !== undefined && golesvisit !== "")) {
                                goleslocal = `<span class="ms-2">(${goleslocal})</span>`;
                                golesvisit = `<span class="ms-2">(${golesvisit})</span>`;
                            } else {
                                golesvisit = "";
                                goleslocal = "";
                            }
                            var arb1 = this.Arb1;
                            var arb2 = this.Arb2;
                            var estadoPartido = this.EstadoPartido;
                            var template = `<tr id="${idpartido}" class="${mostrarpartido}">
                                                    <td class="d-none">${idjornadacomp}</td>
                                                    <td class="d-none"><span class="ms-2 text-white">${nombrejornada}${fechajornada}</span></td>
                                                    <td class="text-center" style="width:140px;"><span class="">${fecha}</a></td>
                                                    <td><span>${equipolocal}</span>${goleslocal}${bonuslocal}</br><span>${equipovisit}</span>${golesvisit}${bonusvisit}</td>
                                                    <td><span>${arb1}</br>${arb2}</span></td>
                                                </tr>`
                            html += template
                        });
                    } else {
                        //$('.tblPartidosDatos').html(html)
                    }
                    $('.tblDesignacionesDatos').html(html)
                    dtdesignaciones = $('#tblDesignaciones').DataTable({
                        //"oLanguage": {
                        //    "sUrl": idiomaDT()
                        //},
                        "dom": "<'row'<'col-sm-12'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12'>>",
                        "rowId": "id",
                        "pageLength": -1,
                        "responsive": false,
                        /*                            "lengthMenu": [[25, 50, 100], [25, 50, 100]],*/
                        "stateSave": false,
                        "ordering": false,
                        initComplete: function () {
                            //dtcalendario.columns.adjust();
                            $("#tblDesignaciones").wrap("<div style='overflow:auto; width:100%;position:relative;'></div>");
                            $('#designaciones').unblock();
                        },
                        "drawCallback": function (settings) {
                            var api = this.api();
                            var rows = api.rows({ page: 'current' }).nodes();
                            var last = null
                            api.column(1, { page: 'current' }).data().each(function (group, i) {
                                if (last !== group) {
                                    $(rows).eq(i).before(
                                        '<tr class="bg-primary"><td colspan="4">' + group + '</td></tr>'
                                    );
                                    last = group;
                                }
                            })
                        }
                    });
                    if (info.error == true) {
                        /* Si hemos enviado por JSON un error, lo notificamos */
                        console.log('Error detectado:', info);
                        return;
                    }
                } catch (error) {
                    /* Si el JSON está mal, notificamos su contenido */
                    console.log('ERROR. Recibido:' + error, response);
                    toastr.error('ERROR. Recibido:' + error, "ERROR")
                    $('#designaciones').unblock();
                }
            },
            /* En caso de error XHR mostramos el error (pasará los parámetros a console.log) */
            error: function error(_error) {
                console.log(JSON.stringify(_error));
                $('#designaciones').unblock();
            }
        });
    });
}
function estadisticasCompeticion() {
    var idcompeticion = $('#txtIdCompeticion').val()
    var modalidad = $('#prmIdModalidad').val()
    $('.estadisticasCompeticion').block(blockOpt())
    var parametros = {
        idcompeticion: idcompeticion,
        modalidad: modalidad
    };
    parametros = JSON.stringify(parametros);
    $(function () {
        $.ajax({
            type: "POST",
            url: "/webservices/WSCompeticiones.asmx/GetEstadisticasCompeticion",
            data: parametros,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function success(response) {
                try {
                    /*Si el JSON está mal formado se generará una excepción */
                    var info = response;
                    var estadisticas = response.d;
                    if (estadisticas == "") {

                    } else {
                        estadisticas = $.parseJSON(estadisticas, (key, value) => value === null ? "-" : value);
                        console.log(estadisticas)
                        procesarEstadisticas(modalidad, estadisticas)
                    }
                    if (info.error == true) {
                        /* Si hemos enviado por JSON un error, lo notificamos */
                        console.log('Error detectado:', info);
                        return;
                    }
                } catch (error) {
                    /* Si el JSON está mal, notificamos su contenido */
                    console.log('ERROR. Recibido:' + error, response);
                    toastr.error('ERROR. Recibido:' + error, "ERROR")
                }
            },
            /* En caso de error XHR mostramos el error (pasará los parámetros a console.log) */
            error: function error(_error) {
                console.log(JSON.stringify(_error));
                $('#divClasificacion').unblock()
            }
        });
    });
}
function procesarEstadisticas(modalidad, datos) {
    var partidos = datos[0].Partidos - datos[0].Pendientes;
    var pendientes = datos[0].Pendientes;
    var victorias = datos[0].Victorias;
    var empates = datos[0].Empates;
    var goles = datos[0].Goles;
    switch (modalidad) {
        case 'hp':
            var penaltis = datos[0].Penaltis;
            var faltasdirectas = datos[0].FaltasDirectas;
            var tarjetasazules = datos[0].TarjetasAzules;
            var tarjetasrojas = datos[0].TarjetasRojas;
            var template = `<div class="col-9 estadistica-comp">
                        <div>
                            <span class="estadistica-titulo"><span class="text-uppercase" data-i18n="PartidosJugados">PARTIDOS JUGADOS</span></span>
                            <span class="estadistica-valor">${partidos}</span>
                        </div>
                    </div>
                    <div class="col-3 estadistica-comp">
                        <div>
                            <span class="estadistica-titulo"><span class="text-uppercase" data-i18n="Pendientes">PENDIENTES</span></span>
                            <span class="estadistica-valor">${pendientes}</span>
                        </div>
                    </div>
                    <div class="col-4 estadistica-comp">
                        <div>
                            <span class="estadistica-titulo"><i class="fa-light fa-medal me-2"></i><span class="text-uppercase" data-i18n="Victorias">VICTORIAS</span></span>
                            <span class="estadistica-valor">${victorias}</span>
                        </div>
                    </div>
                    <div class="col-4 estadistica-comp">
                        <div>
                            <span class="estadistica-titulo"><span class="text-uppercase" data-i18n="Empates">EMPATES</span></span>
                            <span class="estadistica-valor">${empates}</span>
                        </div>
                    </div>
                    <div class="col-4 estadistica-comp">
                        <div>
                            <span class="estadistica-titulo"><i class="fa fa-goal-net me-2"></i><span class="text-uppercase" data-i18n="Goles">Goles</span></span>
                            <span class="estadistica-valor">${goles}</span>
                        </div>
                    </div>
                    <div class="col-3 estadistica-comp">
                        <div>
                            <span class="estadistica-titulo"><i class="fa-light fa-whistle me-2"></i><span class="text-uppercase" data-i18n="Penaltis">PENALTIS</span></span>
                            <span class="estadistica-valor">${penaltis}</span>
                        </div>
                    </div>
                    <div class="col-3 estadistica-comp">
                        <div>
                            <span class="estadistica-titulo"><i class="fa-light fa-whistle me-2"></i><span class="text-uppercase" data-i18n="FaltasDirectas">FALTAS DIRECTAS</span></span>
                            <span class="estadistica-valor">${faltasdirectas}</span>
                        </div>
                    </div>
                    <div class="col-3 estadistica-comp">
                        <div>
                            <span class="estadistica-titulo"><i class="fa-solid fa-cards-blank me-2" style="color:#6385ee;"></i>TARJETAS AZULES</span>
                            <span class="estadistica-valor">${tarjetasazules}</span>
                        </div>
                    </div>
                    <div class="col-3 estadistica-comp">
                        <div>
                            <span class="estadistica-titulo"><i class="fa-solid fa-cards-blank me-2" style="color:red;"></i>TARJETAS ROJAS</span>
                            <span class="estadistica-valor">${tarjetasrojas}</span>
                        </div>
                    </div>`
            $('.estadisticasCompeticion').html(template)
            break;
        case 'hl':
            var template = `<div class="col-md-9 estadistica-comp">
                        <div>
                            <span class="estadistica-titulo"><span class="text-uppercase" data-i18n="PartidosJugados">PARTIDOS JUGADOS</span></span>
                            <span class="estadistica-valor">${partidos}</span>
                        </div>
                    </div>
                    <div class="col-md-3 estadistica-comp">
                        <div>
                            <span class="estadistica-titulo"><span class="text-uppercase" data-i18n="Pendientes">PENDIENTES</span></span>
                            <span class="estadistica-valor">${pendientes}</span>
                        </div>
                    </div>
                    <div class="col-md-4 estadistica-comp">
                        <div>
                            <span class="estadistica-titulo"><i class="fa-light fa-medal me-2"></i><span class="text-uppercase" data-i18n="Victorias">VICTORIAS</span></span>
                            <span class="estadistica-valor">${victorias}</span>
                        </div>
                    </div>
                    <div class="col-md-4 estadistica-comp">
                        <div>
                            <span class="estadistica-titulo"><span class="text-uppercase" data-i18n="Empates">EMPATES</span></span>
                            <span class="estadistica-valor">${empates}</span>
                        </div>
                    </div>
                    <div class="col-md-4 estadistica-comp">
                        <div>
                            <span class="estadistica-titulo"><i class="fa fa-goal-net me-2"></i><span class="text-uppercase" data-i18n="Goles">Goles</span></span>
                            <span class="estadistica-valor">${goles}</span>
                        </div>
                    </div>`
            $('.estadisticasCompeticion').html(template)
    }
    $('.estadisticasCompeticion').unblock()
}
function cargarClasificacion(idcompeticion) {
    var resultadoyclasificacion=0
    if (idcompeticion == "") {
        idcompeticion = $('#txtIdCompeticion').val()
        $('#divClasificacion').html("")
        $('#divClasificacion').block(blockOpt())
        resultadoyclasificacion = 0
    } else {
        resultadoyclasificacion = 1
        $('#clasificacion_' + idcompeticion).html("")
    }
    var html = ""
    var parametros = {
        idcompeticion: idcompeticion
    };
    parametros = JSON.stringify(parametros);
    $(function () {
        $.ajax({
            type: "POST",
            url: "/webservices/WSCompeticiones.asmx/GetClasificacionCompeticion",
            data: parametros,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function success(response) {
                try {
                    /*Si el JSON está mal formado se generará una excepción */
                    var info = response;
                    var clasificacion = response.d;
                    if (clasificacion == "") {

                    } else {
                        clasificacion = $.parseJSON(clasificacion, (key, value) => value === null ? "" : value);
                        console.log("clasificacion " + idcompeticion, clasificacion)
                        var idgrupoprev = -1
                        var idcompprev = 0
                        $(clasificacion).each(function () {
                            //var idfase = this.IdFase;
                            var idcomp = this.IdCompeticion;
                            var idgrupo = this.IdGrupo;
                            var denocomp = this.DenoComp;
                            if (idgrupo != 0) {
                                denocomp = this.NombreGrupo;
                            }
                            var puntobonus = this.PuntoBonus;
                            var bonusvisto = "d-none"
                            if (puntobonus) {
                                bonusvisto=""
                            }
                            if (idgrupo != idgrupoprev) {
                                var divcomp = `<div style="width:100%;overflow-y:auto;margin-bottom:10px;" id="tblClas_${idcomp}_${idgrupo}">
                                                    <table class="table mb-0 table-hover nowrap font-small-3 custom-table tblClasificacion">
                                                        <thead>
                                                        <tr>
                                                        <th colspan="11" style="line-height:20px;font-size:16px;width:100%;"><span class="text-uppercase" data-i18n="Clasificacion">Clasificación</span><span class="ms-1">${denocomp}</span><i class="fa fa-camera no-print" style="float:right;margin-right:5px;cursor:pointer;display:none;" onclick="convertirEnImagen('#tblClas_${idcomp}')"></th>
                                                        </tr>
                                                            <tr>
                                                                <th style="width:70px;">Pos</th>
                                                                <th style="text-align:left;min-width:500px;">Equipo</th>
                                                                <th style="width:70px;">PT</th>
                                                                <th style="width:70px;" class="${bonusvisto}">Bonus</th>
                                                                <th style="width:70px;">PJ</th>
                                                                <th style="width:70px;">PG</th>
                                                                <th style="width:70px;">PE</th>
                                                                <th style="width:70px;">PP</th>
                                                                <th style="width:70px;">GF</th>
                                                                <th style="width:70px;">GC</th>
                                                                <th style="width:70px;">Gav</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody id="tblDatosClasificacion_${idcomp}_${idgrupo}">
                                                        </tbody>
                                                    </table>
                                                </div>`
                                idgrupoprev = idgrupo
                                if (resultadoyclasificacion == 0) {
                                    $('#divClasificacion').append(divcomp)
                                } else {
                                    $('#clasificacion_' + idcompeticion).append(divcomp)
                                }
                            }
                            var posicion = this.Posicion,bonus=this.Bonus, nombreequipo = this.NombreEquipo, puntos = this.Puntos, partidosjugados = this.PartidosJugados;
                            var partidosganados = this.PartidosGanados, partidosempatados = this.PartidosEmpatados, partidosperdidos = this.PartidosPerdidos;
                            var golesafavor = this.GolesAFavor, golesencontra = this.GolesEnContra, diferenciagoles = this.DiferenciaGoles;
                            var identidadequipo = this.IdEntidadEquipo, tienelogo = this.TieneLogo;
                            var equipo=""
                            if (tienelogo) {
                                equipo = `<img src="https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/200x200/${identidadequipo}.png" style="width:22px;height:auto;" alt=""><span class="ms-2">${nombreequipo}</span>`
                            } else {
                                equipo = `<img src="https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/200x200/sinescudo.png" style="width:22px;height:auto;" alt=""><span class="ms-2">${nombreequipo}</span>`
                            }
                            var trdatoscomp = `<tr>
                                                    <td>${posicion}</td>
                                                    <td style="text-align:left;">${equipo}</td>
                                                    <td style="background-color:black;color:white;font-weight:bold;">${puntos}</td>
                                                    <td class="${bonusvisto}">${bonus}</td>
                                                    <td>${partidosjugados}</td>
                                                    <td>${partidosganados}</td>
                                                    <td>${partidosempatados}</td>
                                                    <td>${partidosperdidos}</td>
                                                    <td>${golesafavor}</td>
                                                    <td>${golesencontra}</td>
                                                    <td>${diferenciagoles}</td>
                                                </tr>`
                                                $('#tblDatosClasificacion_' + idcomp + '_' + idgrupo).append(trdatoscomp)
                        })

                    }
                    if (info.error == true) {
                        /* Si hemos enviado por JSON un error, lo notificamos */
                        console.log('Error detectado:', info);
                        return;
                    }
                    $('#divClasificacion').unblock()
                } catch (error) {
                    /* Si el JSON está mal, notificamos su contenido */
                    console.log('ERROR. Recibido:' + error, response);
                    toastr.error('ERROR. Recibido:' + error, "ERROR")
                    $('#divClasificacion').unblock()
                }
            },
            /* En caso de error XHR mostramos el error (pasará los parámetros a console.log) */
            error: function error(_error) {
                console.log(JSON.stringify(_error));
                $('#divClasificacion').unblock()
            }
        });
    });
}
function cargarClasificacionMarcadores(idcompeticion) {
    if ($('.marcador_clasificacion[idcompeticion=' + idcompeticion + ']').html() != "") {
        $('.marcador_clasificacion[idcompeticion=' + idcompeticion + ']').html("")
    } else {
    var html = ""
    var parametros = {
        idcompeticion: idcompeticion
    };
    parametros = JSON.stringify(parametros);
    $(function () {
        $.ajax({
            type: "POST",
            url: "/webservices/WSCompeticiones.asmx/GetClasificacionCompeticion",
            data: parametros,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function success(response) {
                try {
                    /*Si el JSON está mal formado se generará una excepción */
                    var info = response;
                    var clasificacion = response.d;
                    if (clasificacion == "") {

                    } else {
                        clasificacion = $.parseJSON(clasificacion, (key, value) => value === null ? "" : value);
                        console.log(clasificacion)
                        var idgrupoprev = -1
                        var idcompprev = 0
                        $('.marcador_clasificacion[idcompeticion=' + idcompeticion + ']').html("")
                        $(clasificacion).each(function () {
                            //var idfase = this.IdFase;
                            var idcomp = this.IdCompeticion;
                            var idgrupo = this.IdGrupo;
                            var denocomp = this.DenoComp;
                            var puntobonus = this.PuntoBonus;
                            var bonusvisto = "d-none"
                            if (puntobonus) {
                                bonusvisto = ""
                            }
                            if (idgrupo != 0) {
                                denocomp = this.NombreGrupo;
                            }
                            if (idgrupo != idgrupoprev) {
                                var divcomp = `<div style="width:100%;overflow-y:auto;" id="tblClasMarcador_${idcomp}_${idgrupo}">
                                                    <table class="table mb-0 table-hover nowrap font-small-2 custom-table tblClasificacionMarc">
                                                        <thead>
                                                        <tr>
                                                        <th colspan="11" style="line-height:13px;font-size:13px;width:100%;"><span class="text-uppercase">${denocomp}</span><span class="fa fa-circle-xmark" onclick="$('.marcador_clasificacion[idcompeticion=${idcompeticion}]').html('')" style="cursor:pointer;float:right;padding-right:4px;font-size:13px;"></span></th>
                                                        </tr>
                                                            <tr>
                                                                <th>Pos</th>
                                                                <th style="text-align:left;">Eq.</th>
                                                                <th>PT</th>
                                                                <th class="${bonusvisto}">B.</th>
                                                                <th>PJ</th>
                                                                <th>PG</th>
                                                                <th>PE</th>
                                                                <th>PP</th>
                                                                <th>GF</th>
                                                                <th>GC</th>
                                                                <th>Gav</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody id="tblClasificacionMarcador_${idcomp}_${idgrupo}">
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div style="width:100%;background-color:var(--secondary);font-size:13px;color:white;font-weight:bold;display:none;" class="text-center text-uppercase partidos" data-i18n="Partidos">PARTIDOS</div>`
                                idgrupoprev = idgrupo
                                $('.marcador_clasificacion[idcompeticion=' + idcompeticion + ']').append(divcomp)
                            }
                            var posicion = this.Posicion, bonus = this.Bonus, nombreequipoabrev = this.NombreEquipoAbrev, puntos = this.Puntos, partidosjugados = this.PartidosJugados;
                            var partidosganados = this.PartidosGanados, partidosempatados = this.PartidosEmpatados, partidosperdidos = this.PartidosPerdidos;
                            var golesafavor = this.GolesAFavor, golesencontra = this.GolesEnContra, diferenciagoles = this.DiferenciaGoles;
                            var identidadequipo = this.IdEntidadEquipo, tienelogo = this.TieneLogo;
                            var equipo = `<span class="ms-2">${nombreequipoabrev}</span>`

                            var trdatoscomp = `<tr>
                                                    <td>${posicion}</td>
                                                    <td style="text-align:left;font-weight:bold;">${equipo}</td>
                                                    <td style="background-color:black;color:white;font-weight:bold;">${puntos}</td>
                                                    <td class="${bonusvisto}">${bonus}</td>
                                                    <td>${partidosjugados}</td>
                                                    <td>${partidosganados}</td>
                                                    <td>${partidosempatados}</td>
                                                    <td>${partidosperdidos}</td>
                                                    <td>${golesafavor}</td>
                                                    <td>${golesencontra}</td>
                                                    <td>${diferenciagoles}</td>
                                                </tr>`
                            $('#tblClasificacionMarcador_' + idcomp + '_' + idgrupo).append(trdatoscomp)
                        })
                        $('.marcador_clasificacion[idcompeticion=' + idcompeticion + '] .partidos').last().show()
                    }
                    if (info.error == true) {
                        /* Si hemos enviado por JSON un error, lo notificamos */
                        console.log('Error detectado:', info);
                        return;
                    }
                    
                } catch (error) {
                    /* Si el JSON está mal, notificamos su contenido */
                    console.log('ERROR. Recibido:' + error, response);
                    toastr.error('ERROR. Recibido:' + error, "ERROR")
                    
                }
            },
            /* En caso de error XHR mostramos el error (pasará los parámetros a console.log) */
            error: function error(_error) {
                console.log(JSON.stringify(_error));
                
            }
        });
    });
    }
}
function filtrarEquipo(lnk) {
    if ($('#filtroEquipos').hasClass("disabled")) {

    } else {
        if ($(lnk).hasClass("active")) {
            $('.fltEquipo').removeClass("active")
        } else {
            $('.fltEquipo').removeClass("active")
            $(lnk).addClass("active")
        }
        ejecutarFiltro()
    }
}
function ejecutarFiltro() {
    $('.opcionCompeticion.active').click()
}
function comoLlegar(localizacion) {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(function (position) {
            var latitude = position.coords.latitude;
            var longitude = position.coords.longitude;
            console.log("La latitud es " + latitude);
            console.log("La longitud es " + longitude);
            console.log("https://www.google.com/maps/dir/" + latitude + "," + longitude + "/" + localizacion)
            window.open("https://www.google.com/maps/dir/" + latitude + "," + longitude + "/" + localizacion, "_blank")

        });
    } else {
        toastr.info("La geolocalización no está disponible en tu navegador", "Info");
    }
}
//MARCADORES
function cargarMarcadores() {
    var modalidad = $('#prmIdModalidad').val()
    $('.marcadorespartidos').html("")
    var parametros = {
        modalidad: modalidad
    };
    parametros = JSON.stringify(parametros);
    $(function () {
        $.ajax({
            type: "POST",
            url: "/webservices/WSCompeticiones.asmx/GetMarcadores",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: parametros,
            success: function success(response) {
                try {
                    /*Si el JSON está mal formado se generará una excepción */
                    var info = response;
                    if (info.error == true) {
                        /* Si hemos enviado por JSON un error, lo notificamos */
                        Console.log('Error detectado:', info);
                        return;
                    }
                    var idcompeticionprev=0
                    var datosform = response.d;
                    if (datosform != "") {
                        var partidos = $.parseJSON(datosform, (key, value) => value === null ? "" : value);
                        var version = Date.now()
                        //console.log("partidos",partidos)
                        $(partidos).each(function (index, datos) {
                            var idcompeticion = this.IdCompeticion;
                            var idpartido = this.IdPartido;
                            var denocompeticion = this.DenoComp;
                            var estadopartido = this.EstadoPartidoCalc;
                            if (idcompeticion != idcompeticionprev) {
                                var cabecera = `<div id="competicion_${idcompeticion}" class="resultados">
                                                    <div class="marcador_apartado bg-primary text-white" idcompeticion="${idcompeticion}">${denocompeticion}<i class="fa fa-list-ol float-end pt-1 me-2" style="cursor:pointer;font-size:18px;" onclick="cargarClasificacionMarcadores('${idcompeticion}');"></i></div>
                                                    <div class="marcador_clasificacion" idcompeticion="${idcompeticion}"></div>
                                                </div>`
                                idcompeticionprev = idcompeticion
                                $('.marcadorespartidos').append(cabecera)
                            }
                            var template = procesarHtmlMarcadorPartido(datos)
                            $('.marcadorespartidos').append(template)
                            if (estadopartido == 2) {
                                $('.marcador_partido[data-idpartido="' + idpartido + '"]').off()
                                // Manejamos el evento mousedown/touchstart
                                let statsShown = false;
                                $('.marcador_partido[data-idpartido="' + idpartido + '"]').on('mousedown touchstart', function () {
                                    return false; //DESHABILITADO
                                    var $this = $(this); // Guardar el elemento actual
                                    var idpartido = $this.data('idpartido'); // Obtener el idpartido del partido clickeado
                                    var progress = 0;

                                    // Establecer el borde inferior de 3px al hacer clic
                                    $this.css({
                                            'border-bottom-width': '3px',
                                            'border-bottom-style': 'solid',
                                            'border-bottom-color': 'transparent',
                                            'border-image': 'none',
                                            'border-image-slice': '1' // Necesario para el borde-image
                                        
                                    });
                                    $('.marcador_partido').css("border-bottom-width","3px")
                                    // Limpiar cualquier temporizador anterior
                                    clearInterval(intervalTimer);

                                    // Intervalo para actualizar el borde inferior gradualmente
                                    intervalTimer = setInterval(function () {
                                        progress += 10; // Incrementa el progreso cada 100ms (ajustable)
                                        var gradient = `linear-gradient(to right, var(--primary) ${progress}%, transparent ${progress}%)`;
                                        $this.css('border-image', gradient + ' 1'); // Aplicar el gradiente al borde inferior
                                        if (progress >= 100) {
                                            clearInterval(intervalTimer); // Parar si llega al 100%
                                        }
                                    }, 50); // Ejecutar cada 100ms (0.1 segundo)

                                    // Temporizador para ejecutar la acción después de medio segundo
                                    holdTimer = setTimeout(function () {
                                        statsShown = true;
                                        mostrarEstadisticasPartido(idpartido);
                                    }, 500);
                                }).on('mouseup mouseleave touchend', function () {
                                    // Limpiar los temporizadores cuando se suelta o el ratón deja el área
                                    clearTimeout(holdTimer);
                                    clearInterval(intervalTimer);
                                    
                                    // Volver al estado original después de soltar
                                    $(this).css({
                                        'border-bottom-width': '', // Resetear el borde a su valor inicial
                                        'border-image': '', // Resetear el borde a su valor inicial
                                        'border-bottom-color': '' // Resetear el color
                                    });
                                    $('.marcador_partido').css("border-bottom-width", "")
                                }).on("click", function () {
                                    if (!statsShown) {
                                        abrirPartido(idpartido);
                                    }
                                });
                            }
                        });

                    } else {

                    }

                } catch (error) {
                    /* Si el JSON está mal, notificamos su contenido */
                    console.log('ERROR. Recibido:' + error, response);
                }
            },
            /* En caso de error XHR mostramos el error (pasará los parámetros a console.log) */
            Error: function error(_error) {
                console.log(JSON.stringify(_error));
            }
        });
    });
}
function cargarMarcadoresNacionales() {
    var modalidad = $('#prmIdModalidad').val()
    $('.marcadoresnacionales').html("")
    var parametros = {
        modalidad: modalidad
    };
    parametros = JSON.stringify(parametros);
    $(function () {
        $.ajax({
            type: "POST",
            url: "/webservices/WSCompeticiones.asmx/GetPartidosNacionales",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: parametros,
            success: function success(response) {
                try {
                    /*Si el JSON está mal formado se generará una excepción */
                    var info = response;
                    if (info.error == true) {
                        /* Si hemos enviado por JSON un error, lo notificamos */
                        Console.log('Error detectado:', info);
                        return;
                    }
                    var idcompeticionprev = 0
                    var idcompnac=1
                    var datosform = response.d;
                    if (datosform != "") {
                        var partidos = $.parseJSON(datosform, (key, value) => value === null ? "" : value);
                        var version = Date.now()
                        console.log(partidos)
                        $(partidos).each(function (index, datos) {
                            var denocompeticion = this.Competicion;
                            if (denocompeticion != idcompeticionprev) {
                                var cabecera = `<div id="competicion_${idcompnac}" class="resultados">
                                                    <div class="marcador_apartado bg-secondary text-white">${denocompeticion}</div>
                                                    <div class="marcador_clasificacion" idcompeticion="${idcompnac}"></div>
                                                </div>`
                                idcompeticionprev = denocompeticion
                                $('.marcadoresnacionales').append(cabecera)
                                idcompnac+=1
                            }
                            var template = procesarHtmlPartidoNacional(datos)
                            $('.marcadoresnacionales').append(template)
                        });

                    } else {

                    }

                } catch (error) {
                    /* Si el JSON está mal, notificamos su contenido */
                    console.log('ERROR. Recibido:' + error, response);
                }
            },
            /* En caso de error XHR mostramos el error (pasará los parámetros a console.log) */
            Error: function error(_error) {
                console.log(JSON.stringify(_error));
            }
        });
    });
}
function mostrarEstadisticasPartido(idpartido) {
    var parametros = {
        idpartido: idpartido
    };
    parametros = JSON.stringify(parametros);
    $(function () {
        $.ajax({
            type: "POST",
            url: "/webservices/WSCompeticiones.asmx/GetEstadisticaPartido",
            data: parametros,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function success(response) {
                try {
                    /*Si el JSON está mal formado se generará una excepción */
                    var info = response;
                    var datos = response.d;
                    if (datos == "") {

                    } else {
                        datos = $.parseJSON(datos, (key, value) => value === null ? "" : value);
                        console.log(datos)
                        var nombrejornada = "", idmodalidad=""
                        var fecha = "", hora = "", local = "", visit = "", localabrev = "", visitabrev = "", logo1 = "sinescudo", logo2 = "sinescudo"
                        var instalacion = "", goleslocal = 0, golesvisit = 0, goleslocaltot = 0, golesvisittot = 0, faltaslocal = 0, faltasvisit = 0
                        var azuleslocal = 0, azulesvisit = 0, rojaslocal = 0, rojasvisit = 0, directaslocal = 0, directasvisit = 0
                        var penaltislocal=0, penaltisvisit=0, disparoslocal=0,diparosvisit=0, tmlocal=0, tmvisit=0
                        if (datos[0].partido) {
                            $(datos[0].partido).each(function () {
                                instalacion = this.Instalacion;
                                local = this.Local;
                                visit = this.Visit;
                                localabrev = this.LocalAbrev;
                                visitabrev = this.VisitAbrev;
                                goleslocal = this.GolesLocal;
                                golesvisit = this.GolesVisit;
                                idmodalidad = this.IdModalidadComp;
                                if (this.Logo1) {
                                    logo1 = this.IdEnt1
                                }
                                if (this.Logo2) {
                                    logo2 = this.IdEnt2
                                }
                                nombrejornada = this.NombreJornada;
                                fecha = moment(this.Fecha).format("DD/MM/YYYY");
                                hora = this.Hora;
                                if (hora != "") {
                                    hora = '-' + moment(hora, "HH:mm:ss").format("HH:mm")
                                }
                            })
                        }
                        if (datos[0].stats) {
                            var stats=datos[0].stats
                            goleslocaltot = stats.find(stat => stat.IdTipoEvento === "gol" && stat.LocalVisit === 1)?.Total || 0;
                            golesvisittot = stats.find(stat => stat.IdTipoEvento === "gol" && stat.LocalVisit === 2)?.Total || 0;
                            tmlocal = stats.find(stat => stat.IdTipoEvento === "tm" && stat.LocalVisit === 1)?.Total || 0;
                            tmvisit = stats.find(stat => stat.IdTipoEvento === "tm" && stat.LocalVisit === 2)?.Total || 0;
                            faltaslocal = stats.find(stat => (stat.IdTipoEvento === "falta" || stat.IdTipoEvento === "faltahl") && stat.LocalVisit === 1)?.Total || 0;
                            faltasvisit = stats.find(stat => (stat.IdTipoEvento === "falta" || stat.IdTipoEvento === "faltahl") && stat.LocalVisit === 2)?.Total || 0;
                            azuleslocal = stats.find(stat => stat.IdTipoEvento === "tarjetaazul" && stat.LocalVisit === 1)?.Total || 0;
                            azulesvisit = stats.find(stat => stat.IdTipoEvento === "tarjetaazul" && stat.LocalVisit === 2)?.Total || 0;
                            rojaslocal = stats.find(stat => stat.IdTipoEvento === "tarjetaroja" && stat.LocalVisit === 1)?.Total || 0;
                            rojasvisit = stats.find(stat => stat.IdTipoEvento === "tarjetaroja" && stat.LocalVisit === 2)?.Total || 0;
                            penaltislocal = stats.find(stat => stat.IdTipoEvento === "penalti" && stat.LocalVisit === 2)?.Total || 0;
                            penaltisvisit = stats.find(stat => stat.IdTipoEvento === "penalti" && stat.LocalVisit === 1)?.Total || 0;
                            faltadirectalocal = stats.find(stat => stat.IdTipoEvento === "faltadirecta" && stat.LocalVisit === 2)?.Total || 0;
                            faltadirectavisit = stats.find(stat => stat.IdTipoEvento === "faltadirecta" && stat.LocalVisit === 1)?.Total || 0;
                            disparoslocal = stats.find(stat => stat.IdTipoEvento === "parada" && stat.LocalVisit === 2)?.Total || 0;
                            disparosvisit = stats.find(stat => stat.IdTipoEvento === "parada" && stat.LocalVisit === 1)?.Total || 0;
                            disparoslocal += goleslocaltot;
                            disparosvisit += golesvisittot;
                        }
                        var template = `<div class="stats_partido p_${idpartido}">
                        <div class="stats_header">${nombrejornada} | ${fecha} ${hora}<span class="fa fa-circle-xmark" onclick="$('.p_${idpartido}').remove();$('.marcador_partido[data-idpartido=${idpartido}]').show();" style="cursor:pointer;float:right;padding:4px;font-size:18px;"></span></div>
                        <div class="p-2" style="width:100%;display:flex;">
                            <div style="width:80px;"><img src="https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/200x200/${logo1}.png" class="img-fluid"/></div>
                            <div style="flex-grow:1;">
                                <div class="text-center" style="font-size:10px;font-weight:bold;line-height:15px;">FINALIZADO</div>
                                <div class="text-center" style="font-size:18px;font-weight:bold;line-height:22px;">${local}</div>
                                <div class="text-center" style="font-size:18px;font-weight:bold;line-height:22px;">${visit}</div>
                                <div class="text-center" style="font-size:12px;font-weight:500;line-height:18px;"><i class="fa-regular fa-court-sport me-2"></i>${instalacion}</div>
                            </div>
                            <div style="width:80px;"><img src="https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/200x200/${logo2}.png" class="img-fluid"/></div>
                        </div>
                        <div class="p-2">
                        <div class="mt-2" style="width:100%;display:flex;background-color:lightgrey;padding:0px 5px;font-size:18px;font-weight:bold;line-height:22px;">
                                <div class="text-center" style="width:80px;background-color:grey;color:white;">${localabrev}</div>
                                <div style="flex-grow:1;">
                                    <div class="text-center">EQUIPOS</div>
                                </div>
                                <div class="text-center" style="width:80px;background-color:grey;color:white;">${visitabrev}</div>
                            </div>
                            <div class="mt-2" style="width:100%;display:flex;background-color:lightgrey;padding:0px 5px;font-size:18px;font-weight:bold;line-height:42px;">
                                <div class="text-center" style="width:80px;background-color:grey;color:white;font-size:35px;">${goleslocal}</div>
                                <div style="flex-grow:1;">
                                    <div class="text-center">GOLES</div>
                                </div>
                                <div class="text-center" style="width:80px;background-color:grey;color:white;font-size:35px">${golesvisit}</div>
                            </div>
                            <div class="mt-2" style="width:100%;display:flex;background-color:lightgrey;padding:0px 5px;font-size:18px;font-weight:bold;line-height:22px;">
                                <div class="text-center" style="width:80px;background-color:grey;color:white;">${faltaslocal}</div>
                                <div style="flex-grow:1;">
                                    <div class="text-center">FALTAS</div>
                                </div>
                                <div class="text-center" style="width:80px;background-color:grey;color:white;">${faltasvisit}</div>
                            </div>
                            <div class="mt-2 hp-hide" style="width:100%;display:flex;background-color:lightgrey;padding:0px 5px;font-size:18px;font-weight:bold;line-height:22px;">
                                <div class="text-center" style="width:80px;background-color:grey;color:white;">${disparoslocal}</div>
                                <div style="flex-grow:1;">
                                    <div class="text-center">DISPAROS</div>
                                </div>
                                <div class="text-center" style="width:80px;background-color:grey;color:white;">${disparosvisit}</div>
                            </div>
                            <div class="mt-2" style="width:100%;display:flex;background-color:lightgrey;padding:0px 5px;font-size:18px;font-weight:bold;line-height:22px;">
                                <div class="text-center" style="width:80px;background-color:grey;color:white;">${tmlocal}</div>
                                <div style="flex-grow:1;">
                                    <div class="text-center">TIEMPOS MUERTOS</div>
                                </div>
                                <div class="text-center" style="width:80px;background-color:grey;color:white;">${tmvisit}</div>
                            </div>
                            <div class="mt-2 hl-hide" style="width:100%;display:flex;background-color:lightgrey;padding:0px 5px;font-size:18px;font-weight:bold;line-height:22px;">
                                <div class="text-center" style="width:80px;background-color:grey;color:white;">${azuleslocal}</div>
                                <div style="flex-grow:1;">
                                    <div class="text-center">TARJETAS AZULES</div>
                                </div>
                                <div class="text-center" style="width:80px;background-color:grey;color:white;">${azulesvisit}</div>
                            </div>
                            <div class="mt-2 hl-hide" style="width:100%;display:flex;background-color:lightgrey;padding:0px 5px;font-size:18px;font-weight:bold;line-height:22px;">
                                <div class="text-center" style="width:80px;background-color:grey;color:white;">${rojaslocal}</div>
                                <div style="flex-grow:1;">
                                    <div class="text-center">TARJETAS ROJAS</div>
                                </div>
                                <div class="text-center" style="width:80px;background-color:grey;color:white;">${rojasvisit}</div>
                            </div>
                            <div class="mt-2 hl-hide" style="width:100%;display:flex;background-color:lightgrey;padding:0px 5px;font-size:18px;font-weight:bold;line-height:22px;">
                                <div class="text-center" style="width:80px;background-color:grey;color:white;">${directaslocal}</div>
                                <div style="flex-grow:1;">
                                    <div class="text-center">FALTAS DIRECTAS</div>
                                </div>
                                <div class="text-center" style="width:80px;background-color:grey;color:white;">${directasvisit}</div>
                            </div>
                            <div class="mt-2 hl-hide" style="width:100%;display:flex;background-color:lightgrey;padding:0px 5px;font-size:18px;font-weight:bold;line-height:22px;">
                                <div class="text-center" style="width:80px;background-color:grey;color:white;">${penaltislocal}</div>
                                <div style="flex-grow:1;">
                                    <div class="text-center">PENALTIS</div>
                                </div>
                                <div class="text-center" style="width:80px;background-color:grey;color:white;">${penaltisvisit}</div>
                            </div>
                        </div>`
                        $('.marcador_partido[data-idpartido=' + idpartido + ']').after(template)
                        $('.marcador_partido[data-idpartido=' + idpartido + ']').hide()
                        $('.' + idmodalidad + '-hide').hide()
                    }

                        
                   
                } catch (error) {
                    /* Si el JSON está mal, notificamos su contenido */
                    console.log('ERROR. Recibido:' + error, response);

                }
            },

            /* En caso de error XHR mostramos el error (pasará los parámetros a console.log) */
            error: function error(_error) {
                console.log(JSON.stringify(_error));
            }
        });
    });
}
//ESTADISTICAS
function estadisticasJugadoresCompeticion() {
    var idcompeticion = $('#txtIdCompeticion').val()
    var modalidad = $('#prmIdModalidad').val()
    $('#estadisticas .masonry.row').html("")
    $('#players-estadisticas').html("")
    $('#estadisticas').block(blockOpt())
    var parametros = {
        idcompeticion: idcompeticion
    };
    parametros = JSON.stringify(parametros);
    $(function () {
        $.ajax({
            type: "POST",
            url: "/webservices/WSCompeticiones.asmx/GetEstadisticasJugadoresCompeticion",
            data: parametros,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function success(response) {
                try {
                    /*Si el JSON está mal formado se generará una excepción */
                    var info = response;
                    var estadisticas = response.d;
                    if (estadisticas == "") {

                    } else {
                        estadisticas = $.parseJSON(estadisticas);
                        if (estadisticas[0].goles) {
                            var goles = estadisticas[0].goles
                            var template =`<div class="masonry-item no-default-style col-6 mb-2" style="position: absolute; left: 0%; top: 0px;">
                                                <div class="row m-0">
                                                    <div class="col-12" style="background-color: var(--primary); color: white;">
                                                        GOLEADORES
                                                    </div>
                                                </div>
                                                <div class="row m-0">
                                                    <div class="col-12 p-0" style="max-height:193px;overflow-y:auto;">
                                                        <table class="table mb-0 table-hover nowrap custom-table tblEstadisticas" style="overflow-y:auto;">
                                                            <thead>
                                                                <tr style="position: sticky;top: 0;">
                                                                    <th style="width:40px;">Pos.</th>
                                                                    <th style="width:60px;">Eq.</th>
                                                                    <th></th>
                                                                    <th style="width:40px;">G</th>
                                                                    <th style="width:40px;">P</th>
                                                                    <th style="width:40px;">Gpp</th>
                                                                <tr>
                                                            </thead>
                                                            <tbody id="tblEstadisticas_goles">
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>`
                                    $('#estadisticas .masonry.row').append(template)
                            var ficha=0
                            $(goles).each(function () {
                                var nombre = this.Nombre;
                                var apellido1 = this.Apellido1;
                                var goles = this.Goles;
                                var partidos = this.Partidos;
                                var golesporpartido=(goles/partidos).toFixed(2)
                                var nombreequipo = this.NombreEquipo;
                                var idfoto = this.IdHashLicencia;
                                var rank = this.Rank;
                                var nombreequipoabrev = this.NombreEquipoAbrev;
                                template =`<div class="col-4 mt-2">
                                                <div class="row m-0">
                                                    <div class="col-12" style="background-color: var(--primary); color: white;">
                                                        MÁXIMO/A GOLEADOR/A
                                                    </div>
                                                </div>
                                                <div class="player-card goles">

                                                <div class="row">
                                                <div class="col-3 p-0">
                                                    <img src="https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/licencias/foto/${idfoto}.jpg" alt="${nombre} ${apellido1}">
                                                </div>
                                                <div class="col-9 text-start">
                                                    <h5 class="mt-1 mb-0"><span class="text-capitalize">${nombre}</span> ${apellido1}</h5>
                                                    <div class="text-muted">${nombreequipo}</div>
                                                    <div class="row">
                                                       <div class="col-6">
                                                            <div class="stat-title" data-i18n="GolesMarcados">GOLES</div>
                                                            <div class="stat-value">${goles}</div>
                                                       </div>
                                                       <div class="col-6">
                                                        <div class="stat-title" data-i18n="GolesPorPartido">POR PARTIDO</div>
                                                            <div class="stat-value">${golesporpartido}</div>
                                                       </div>
                                                    </div>
                                                </div>
                                            </div>
                                            </div>
                                        </div>`
                                if (ficha == 0) {
                                    $('#players-estadisticas').append(template)
                                }
                                var row =`<tr>
                                            <td class="fw-bold">${rank}</td>
                                            <td>${nombreequipoabrev}</td>
                                            <td style="text-align:left;"><span class="text-capitalize">${nombre}</span> ${apellido1}</td>
                                            <td class="fw-bold" style="background-color:var(--primary);color:white;">${goles}</td>
                                            <td>${partidos}</td>
                                            <td>${golesporpartido}</td>
                                        <tr>`
                                $('#tblEstadisticas_goles').append(row)
                                ficha=1
                            })
                        }
                        if (estadisticas[0].tarjazul) {
                            var tarjazul = estadisticas[0].tarjazul
                            var template = `<div class="masonry-item no-default-style col-6 mb-2" style="position: absolute; left: 0%; top: 0px;">
                                                <div class="row m-0">
                                                    <div class="col-12" style="background-color: var(--primary); color: white;">
                                                        TARJETAS AZULES
                                                    </div>
                                                </div>
                                                <div class="row m-0">
                                                    <div class="col-12 p-0" style="max-height:193px;overflow-y:auto;">
                                                        <table class="table mb-0 table-hover nowrap custom-table tblEstadisticas" style="overflow-y:auto;">
                                                            <thead>
                                                                <tr style="position: sticky;top: 0;">
                                                                    <th style="width:40px;">Pos.</th>
                                                                    <th style="width:60px;">Eq.</th>
                                                                    <th></th>
                                                                    <th style="width:40px;">Az.</th>
                                                                    <th style="width:40px;">P</th>
                                                                    <th style="width:40px;">Azpp</th>
                                                                <tr>
                                                            </thead>
                                                            <tbody id="tblEstadisticas_tarjazul">
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>`
                            $('#estadisticas .masonry.row').append(template)
                            ficha = 0
                            $(tarjazul).each(function () {
                                var nombre = this.Nombre;
                                var apellido1 = this.Apellido1;
                                var tarjetas = this.TarjAzul;
                                var partidos = this.Partidos;
                                var tarjporpartido = (tarjetas / partidos).toFixed(2)
                                var nombreequipo = this.NombreEquipo;
                                var idfoto = this.IdHashLicencia;
                                var rank = this.Rank;
                                var nombreequipoabrev = this.NombreEquipoAbrev;
                                template = `<div class="col-4 mt-2">
                                                <div class="row m-0">
                                                    <div class="col-12" style="background-color: var(--primary); color: white;">
                                                        TARJETAS AZULES
                                                    </div>
                                                </div>
                                                <div class="player-card tarjazul">
                                            
                                                <div class="row">
                                                    <div class="col-3 p-0">
                                                        <img src="https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/licencias/foto/${idfoto}.jpg" alt="${nombre} ${apellido1}">
                                                    </div>
                                                    <div class="col-9 text-start">
                                                        <h5 class="mt-1 mb-0"><span class="text-capitalize">${nombre}</span> ${apellido1}</h5>
                                                        <div class="text-muted">${nombreequipo}</div>
                                                        <div class="row">
                                                           <div class="col-6">
                                                                <div class="stat-title" data-i18n="TarjetasAzules">AZULES</div>
                                                                <div class="stat-value">${tarjetas}</div>
                                                           </div>
                                                           <div class="col-6">
                                                            <div class="stat-title" data-i18n="AzulesPorPartido">POR PARTIDO</div>
                                                                <div class="stat-value">${tarjporpartido}</div>
                                                           </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>`
                                if (ficha == 0) {
                                    $('#players-estadisticas').append(template)
                                }
                                var row = `<tr>
                                            <td class="fw-bold">${rank}</td>
                                            <td>${nombreequipoabrev}</td>
                                            <td style="text-align:left;"><span class="text-capitalize">${nombre}</span> ${apellido1}</td>
                                            <td class="fw-bold" style="background-color:var(--primary);color:white;">${tarjetas}</td>
                                            <td>${partidos}</td>
                                            <td>${tarjporpartido}</td>
                                        <tr>`
                                $('#tblEstadisticas_tarjazul').append(row)
                                ficha = 1
                            })
                        }
                        if (estadisticas[0].tarjroja) {
                            var tarjroja = estadisticas[0].tarjroja
                            var template = `<div class="masonry-item no-default-style col-6 mb-2" style="position: absolute; left: 0%; top: 0px;">
                                                <div class="row m-0">
                                                    <div class="col-12" style="background-color: var(--primary); color: white;">
                                                        TARJETAS ROJA
                                                    </div>
                                                </div>
                                                <div class="row m-0">
                                                    <div class="col-12 p-0" style="max-height:193px;overflow-y:auto;">
                                                        <table class="table mb-0 table-hover nowrap custom-table tblEstadisticas" style="overflow-y:auto;">
                                                            <thead>
                                                                <tr style="position: sticky;top: 0;">
                                                                    <th style="width:40px;">Pos.</th>
                                                                    <th style="width:60px;">Eq.</th>
                                                                    <th></th>
                                                                    <th style="width:40px;">Rj.</th>
                                                                    <th style="width:40px;">P</th>
                                                                    <th style="width:40px;">Rjpp</th>
                                                                <tr>
                                                            </thead>
                                                            <tbody id="tblEstadisticas_tarjroja">
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>`
                            $('#estadisticas .masonry.row').append(template)
                            ficha = 0
                            $(tarjroja).each(function () {
                                var nombre = this.Nombre;
                                var apellido1 = this.Apellido1;
                                var tarjetas = this.TarjRoja;
                                var partidos = this.Partidos;
                                var tarjporpartido = (tarjetas / partidos).toFixed(2)
                                var nombreequipo = this.NombreEquipo;
                                var idfoto = this.IdHashLicencia;
                                var rank = this.Rank;
                                var nombreequipoabrev = this.NombreEquipoAbrev;
                                template = `<div class="col-4 mt-2">
                                                <div class="row m-0">
                                                    <div class="col-12" style="background-color: var(--primary); color: white;">
                                                        TARJETAS ROJAS
                                                    </div>
                                                </div>
                                                <div class="player-card tarjroja">
                                            
                                                <div class="row">
                                                    <div class="col-3 p-0">
                                                        <img src="https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/licencias/foto/${idfoto}.jpg" alt="${nombre} ${apellido1}">
                                                    </div>
                                                    <div class="col-9 text-start">
                                                        <h5 class="mt-1 mb-0"><span class="text-capitalize">${nombre}</span> ${apellido1}</h5>
                                                        <div class="text-muted">${nombreequipo}</div>
                                                        <div class="row">
                                                           <div class="col-6">
                                                                <div class="stat-title" data-i18n="TarjetasAzules">ROJAS</div>
                                                                <div class="stat-value">${tarjetas}</div>
                                                           </div>
                                                           <div class="col-6">
                                                            <div class="stat-title" data-i18n="AzulesPorPartido">POR PARTIDO</div>
                                                                <div class="stat-value">${tarjporpartido}</div>
                                                           </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>`
                                if (ficha == 0) {
                                    $('#players-estadisticas').append(template)
                                }
                                var row = `<tr>
                                            <td class="fw-bold">${rank}</td>
                                            <td>${nombreequipoabrev}</td>
                                            <td style="text-align:left;"><span class="text-capitalize">${nombre}</span> ${apellido1}</td>
                                            <td class="fw-bold" style="background-color:var(--primary);color:white;">${tarjetas}</td>
                                            <td>${partidos}</td>
                                            <td>${tarjporpartido}</td>
                                        <tr>`
                                $('#tblEstadisticas_tarjroja').append(row)
                                ficha = 1
                            })
                        }
                        if (estadisticas[0].asist) {
                            var asist = estadisticas[0].asist
                            var template = `<div class="masonry-item no-default-style col-6 mb-2" style="position: absolute; left: 0%; top: 0px;">
                                                <div class="row m-0">
                                                    <div class="col-12" style="background-color: var(--primary); color: white;">
                                                        ASISTENCIAS
                                                    </div>
                                                </div>
                                                <div class="row m-0">
                                                    <div class="col-12 p-0" style="max-height:193px;overflow-y:auto;">
                                                        <table class="table mb-0 table-hover nowrap custom-table tblEstadisticas" style="overflow-y:auto;">
                                                            <thead>
                                                                <tr style="position: sticky;top: 0;">
                                                                    <th style="width:40px;">Pos.</th>
                                                                    <th style="width:60px;">Eq.</th>
                                                                    <th></th>
                                                                    <th style="width:40px;">As.</th>
                                                                    <th style="width:40px;">P</th>
                                                                    <th style="width:40px;">Aspp</th>
                                                                <tr>
                                                            </thead>
                                                            <tbody id="tblEstadisticas_asist">
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>`
                            $('#estadisticas .masonry.row').append(template)
                            ficha = 0
                            $(asist).each(function () {
                                var nombre = this.Nombre;
                                var apellido1 = this.Apellido1;
                                var asist = this.Asist;
                                var partidos = this.Partidos;
                                var asistporpartido = (asist / partidos).toFixed(2)
                                var nombreequipo = this.NombreEquipo;
                                var idfoto = this.IdHashLicencia;
                                var rank = this.Rank;
                                var nombreequipoabrev = this.NombreEquipoAbrev;
                                template = `<div class="col-4 mt-2">
                                                <div class="row m-0">
                                                    <div class="col-12" style="background-color: var(--primary); color: white;">
                                                        ASISTENCIAS
                                                    </div>
                                                </div>
                                                <div class="player-card asist">
                                            
                                                <div class="row">
                                                    <div class="col-3 p-0">
                                                        <img src="https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/licencias/foto/${idfoto}.jpg" alt="${nombre} ${apellido1}">
                                                    </div>
                                                    <div class="col-9 text-start">
                                                        <h5 class="mt-1 mb-0"><span class="text-capitalize">${nombre}</span> ${apellido1}</h5>
                                                        <div class="text-muted">${nombreequipo}</div>
                                                        <div class="row">
                                                           <div class="col-6">
                                                                <div class="stat-title" data-i18n="Asistencias">ASISTENCIAS</div>
                                                                <div class="stat-value">${asist}</div>
                                                           </div>
                                                           <div class="col-6">
                                                            <div class="stat-title" data-i18n="PorPartido">POR PARTIDO</div>
                                                                <div class="stat-value">${asistporpartido}</div>
                                                           </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>`
                                if (ficha == 0) {
                                    $('#players-estadisticas').append(template)
                                }
                                var row = `<tr>
                                            <td class="fw-bold">${rank}</td>
                                            <td>${nombreequipoabrev}</td>
                                            <td style="text-align:left;"><span class="text-capitalize">${nombre}</span> ${apellido1}</td>
                                            <td class="fw-bold" style="background-color:var(--primary);color:white;">${asist}</td>
                                            <td>${partidos}</td>
                                            <td>${asistporpartido}</td>
                                        <tr>`
                                $('#tblEstadisticas_asist').append(row)
                                ficha = 1
                            })
                        }
                        if (estadisticas[0].porteros) {
                            var portero = estadisticas[0].porteros
                            var template = `<div class="masonry-item no-default-style col-6 mb-2" style="position: absolute; left: 0%; top: 0px;">
                                                <div class="row m-0">
                                                    <div class="col-12" style="background-color: var(--primary); color: white;">
                                                        PARADAS
                                                    </div>
                                                </div>
                                                <div class="row m-0">
                                                    <div class="col-12 p-0" style="max-height:193px;overflow-y:auto;">
                                                        <table class="table mb-0 table-hover nowrap custom-table tblEstadisticas" style="overflow-y:auto;">
                                                            <thead>
                                                                <tr style="position: sticky;top: 0;">
                                                                    <th style="width:40px;">Pos.</th>
                                                                    <th style="width:60px;">Eq.</th>
                                                                    <th></th>
                                                                    <th style="width:60px;">% Par.</th>
                                                                    <th style="width:40px;">P</th>
                                                                    <th style="width:60px;">Disp(G)</th>
                                                                <tr>
                                                            </thead>
                                                            <tbody id="tblEstadisticas_portero">
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>`
                            $('#estadisticas .masonry.row').append(template)
                            ficha = 0
                            $(portero).each(function () {
                                var nombre = this.Nombre;
                                var apellido1 = this.Apellido1;
                                var paradas = this.Paradas * 100;
                                console.log("paradas",paradas)
                                paradas = paradas.toFixed(2)
                                var partidos = this.Partidos;
                                var tirostotales = this.TirosTotales;
                                var golesrecibidos = this.GolesRecibidos;
                                //var asistporpartido = (asist / partidos).toFixed(2)
                                var nombreequipo = this.NombreEquipo;
                                var idfoto = this.IdHashLicencia;
                                var rank = this.Rank;
                                var nombreequipoabrev = this.NombreEquipoAbrev;
                                template = `<div class="col-4 mt-2">
                                                <div class="row m-0">
                                                    <div class="col-12" style="background-color: var(--primary); color: white;">
                                                        PORTERO
                                                    </div>
                                                </div>
                                                <div class="player-card portero">
                                            
                                                <div class="row">
                                                    <div class="col-3 p-0">
                                                        <img src="https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/licencias/foto/${idfoto}.jpg" alt="${nombre} ${apellido1}">
                                                    </div>
                                                    <div class="col-9 text-start">
                                                        <h5 class="mt-1 mb-0"><span class="text-capitalize">${nombre}</span> ${apellido1}</h5>
                                                        <div class="text-muted">${nombreequipo}</div>
                                                        <div class="row">
                                                           <div class="col-6">
                                                                <div class="stat-title" data-i18n="Asistencias">DISPAROS</div>
                                                                <div class="stat-value">${tirostotales} (${golesrecibidos})</div>
                                                           </div>
                                                           <div class="col-6">
                                                            <div class="stat-title" data-i18n="PorPartido">% PARADAS</div>
                                                                <div class="stat-value">${paradas}%</div>
                                                           </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>`
                                if (ficha == 0) {
                                    $('#players-estadisticas').append(template)
                                }
                                var row = `<tr>
                                            <td class="fw-bold">${rank}</td>
                                            <td>${nombreequipoabrev}</td>
                                            <td style="text-align:left;"><span class="text-capitalize">${nombre}</span> ${apellido1}</td>
                                            <td class="fw-bold" style="background-color:var(--primary);color:white;">${paradas}%</td>
                                            <td>${partidos}</td>
                                            <td>${tirostotales} (${golesrecibidos})</td>
                                        <tr>`
                                $('#tblEstadisticas_portero').append(row)
                                ficha = 1
                            })
                        }
                    }
                    if (info.error == true) {
                        /* Si hemos enviado por JSON un error, lo notificamos */
                        console.log('Error detectado:', info);
                        return;
                    }
                    updateMasonryAfterContentLoad()
                    $('#estadisticas').localize()
                    $('#estadisticas').unblock()
                } catch (error) {
                    /* Si el JSON está mal, notificamos su contenido */
                    console.log('ERROR. Recibido:' + error, response);
                    toastr.error('ERROR. Recibido:' + error, "ERROR")
                    $('#estadisticas').unblock()
                }
            },
            /* En caso de error XHR mostramos el error (pasará los parámetros a console.log) */
            error: function error(_error) {
                console.log(JSON.stringify(_error));
                $('#estadisticas').unblock()
            }
        });
    });
}
//PARTIDO
function cerrarPartido(lnk, idpartido) {
    $('#tab-competicion').click()
    var href=$(lnk).attr("href")
    if ($(lnk).closest('a').hasClass('active')) {
        var firstTab = $('.nav-link.competicion').first();
        var tabInstance = new bootstrap.Tab(firstTab[0]);
        tabInstance.show();
    }
    var tab = $(lnk).closest('.nav-item'); 
    var tabId = $(lnk).closest('a').attr('href');

    tab.remove();
    $(tabId).remove();
    salirDePartido(idpartido)
}
function abrirPartido(idpartido, eq1, eq2) {
    requestWakeLock()
    if ($('.tab-partidos #partido_' + idpartido).length != 0) {

    } else {
        var tab =`<li class="nav-item" role="presentation">
                        <a class="nav-link px-2" href="#partido_${idpartido}" data-bs-toggle="tab" aria-selected="false" tabindex="-1" role="tab">${eq1} - ${eq2} <i class="fa-solid fa-xmark ms-2" style="color:red;" onclick="event.stopPropagation();cerrarPartido(this,'${idpartido}')"></i></a>
                    </li>`
        $('.nav-tabs.tab-partidos').append(tab)
        var template =`<div id="partido_${idpartido}" class="tab-pane" role="tabpanel">
                        
                    </div>`
        $('.tab-content.tab-partidos').append(template)
        cargarPartido(idpartido)
    }
    var newTab = $(`a[href="#partido_${idpartido}"]`);
    var tabInstance = new bootstrap.Tab(newTab[0]);
    tabInstance.show();

}
function cargarPartido(idpartido) {
        var parametros = {
            idpartido: idpartido
        };
        parametros = JSON.stringify(parametros);
        $(function () {
            $.ajax({
                type: "POST",
                url: "/webservices/WSCompeticiones.asmx/GetParametrosPartido",
                data: parametros,
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: function success(response) {
                    try {
                        /*Si el JSON está mal formado se generará una excepción */
                        var info = response;
                        var parametros = response.d;
                        if (parametros != "") {
                            prm = $.parseJSON(parametros, (key, value) => value === null ? "" : value);
                            
                            var part = prm[0]
                            console.log("partidocabe",part);
                            var denocompeticion = part.DenoComp;
                            var nombrejornada = part.NombreJornada;
                            var arb1 = part.Arb1;
                            var arb2 = part.Arb2;
                            var fecha = part.Fecha;
                            var hora = part.Hora;
                            var instalacion = part.Instalacion;
                            var eq1 = part.Eq1;
                            var eq2 = part.Eq2;
                            var goleslocal = part.GolesLocal;
                            var golesvisit = part.GolesVisit;
                            var identidadeq1 = part.IdEntidadEq1;
                            var identidadeq2 = part.IdEntidadEq2;
                            var idmodalidad = part.IdModalidadComp;
                            var ideq1 = part.IdEq1;
                            var ideq2 = part.IdEq2;
                            var crono = ""
                            var puntobonus = part.PuntoBonus;
                            var bonuslocal = "";
                            var bonusvisit = "";
                                console.log("bonus", puntobonus, ideq1, ideq2)
                            if (puntobonus != "") {
                                if (puntobonus == ideq1) {
                                    bonuslocal = `*`;
                                }
                                if (puntobonus == ideq2) {
                                    bonusvisit = `*`;
                                }
                            }
                            var plataformavideo = part.PlataformaVideo;
                            let video=""
                            var urlvideo = part.UrlVideo;
                            if (urlvideo != "" && plataformavideo != "") {
                                switch (plataformavideo) {
                                    case "YouTube":
                                        video = `<blockquote class="blockquote-primary mt-2 mb-0 with-borders">
                                                    <h5 class="font-weight-semi-bold mb-0">Video<a href="https://www.youtube.com/embed/${urlvideo}&autoplay=1&mute=1" target="_blank"><i class="fa fa-eye float-end"></i></a></h5>
                                                </blockquote>
                                                <div class="embed-responsive embed-responsive-16by9 ratio ratio-16x9 mb-2" style="float: none;">
                                                    <iframe frameborder="0" src="https://www.youtube.com/embed/${urlvideo}?rel=0&loop=0" width="auto" height="auto" allow="autoplay; encrypted-media" allowfullscreen class="note-video-clip" style="float: none;"></iframe>
                                                </div>`
                                }
                            }
                            var periodo = i18next.t(part.Periodo);
                            if (part.Periodo == "Final" || part.Periodo == "SinComenzar") {

                            } else {
                                crono = "<i class='fa-light fa-clock me-2'></i>" + part.Crono + "<i class='fa-light fa-clock ms-2'></i>"
                            }
                            var cabecerapartido = `<div style="border-bottom:1px solid lightgray;height:160px;width:100%;position:relative">
                            <input type="text" id="ideq1_${idpartido}" style="display:none;" value="${ideq1}"/>
                            <input type="text" id="ideq2_${idpartido}" style="display:none;" value="${ideq2}"/>
                                    <div style="position:absolute;top:5px;left:8px;font-weight:600">
                                        ${denocompeticion} - ${nombrejornada}
                                    </div>
                                    <div style="position:absolute;bottom:5px;left:8px;font-weight:600; line-height:15px;">
                                        ARBITROS:<br />
                                        ${arb1}<br />
                                        ${arb2}
                                    </div>
                                    <div style="position:absolute;top:5px;right:8px;font-weight:600">
                                        ${fecha} - ${hora}
                                    </div>
                                    <div style="position:absolute;bottom:5px;right:8px;font-weight:600">
                                        ${instalacion}
                                    </div>
                                    <div style="width:530px;height:70px;position:absolute;top:40px;left:0px;display: flex; align-items: center;">
                                        <div class="equipo1" style="width: 460px; font-size: 26px; height: 60px; font-weight: bold; padding: 0px 10px; color: black; display: flex; justify-content: flex-end; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right;">
                                            ${eq1}
                                        </div>
                                        <div style="">
                                            <img src="https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/200x200/${identidadeq1}.png" style="width:70px;height:auto;" alt="">
                                        </div>

                                    </div>
                                    <div style="width: 140px; position: absolute; top: 15px; right: 530px;justify-content:center;">
                                        <div class="resultado fw-bold estadopartido_${idpartido}" style="display:flex; width:140px;justify-content:center;">
                                            <div class="badge badge-dark text-uppercase" style="font-size: 14px;">
                                                ${periodo}
                                            </div>
                                        </div>
                                    </div>
                                    <div style="width: 140px; position: absolute; top: 50px; right: 530px;justify-content:center;">
                                        <div class="resultado fw-bold" style="font-size:40px;display:flex; width:140px;justify-content:center;">
                                            <div class="goles local me-1" style="color:black;">
                                                ${goleslocal}
                                            </div>
                                            ${bonuslocal}
                                            -
                                            <div class="goles visit ms-1" style="color:black;">
                                                ${golesvisit}
                                            </div>
                                            ${bonusvisit}
                                        </div>
                                    </div>
                                    <div style="width: 140px; position: absolute; top: 85px; right: 530px;justify-content:center;">
                                        <div class="marcador marcador_${idpartido} hl-hide">
                                            <div class="equipo local">
                                                <div class="panelfalta"><span>0</span></div>
                                                <div class="panelfalta"><span>0</span></div>
                                            </div>
                                            <div class="equipo visit" style="margin-left:2px;">
                                                <div class="panelfalta eq2"><span>0</span></div>
                                                <div class="panelfalta eq2"><span>0</span></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style="width: 140px; position: absolute; top: 130px; right: 530px;justify-content:center;">
                                        <div class="cronopartido_${idpartido}" style="font-size:25px;font-weight:bold;text-align:center;">
                                            ${crono}
                                        </div>
                                    </div>
                                    <div style="width: 530px; height: 70px; position: absolute; top: 40px; right: 0px; display: flex; align-items: center;">
                                        <div style="">
                                            <img src="https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/200x200/${identidadeq2}.png" style="width:70px;height:auto;" alt="">
                                        </div>
                                        <div class="equipo2" style="width: 460px; font-size: 26px; height: 60px; font-weight: bold; padding: 0px 10px; color: black; display: flex; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; ">
                                            ${eq2}
                                        </div>
                                    </div>
                                </div>
                                <div class="row mt-1">
                                <div class="col-7">
                                    <div class="col-12 penaltispartido mb-3">
                                        <div class="text-center" style="width:100%;font-weight:bold;padding:0px 5px;text-transform:uppercase;color:white;border:1px solid lightgray;background-color: var(--primary);" data-i18n="LanzamientosDePenaltis">Lanzamientos de penaltis</div>
                                        <div class="row m-0">
                                            <div class="col-6 text-center" style="font-weight:bold;color:white;background-color: var(--secondary);">${eq1}</div>
                                            <div class="col-6 text-center" style="font-weight:bold;color:white;background-color: var(--secondary);">${eq2}</div>
                                        </div>
                                        <div class="row m-0">
                                            <div class="col-6 p-0 divpenaltislocal">
                                            
                                            </div>
                                            <div class="col-6 p-0 divpenaltisvisit">
                                            
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-12 alineacionespartido" id="alin-${idpartido}">
                                        <div class="juglocal mt-0" style="width:100%">

                                        </div>
                                        <div class="portlocal mt-0" style="width:100%">

                                        </div>
                                        <div class="tecnlocal mt-1" style="width:100%">

                                        </div>
                                        <div class="jugvisit mt-4" style="width:100%">

                                        </div>
                                        <div class="portvisit mt-0" style="width:100%">

                                        </div>
                                        <div class="tecnvisit mt-1" style="width:100%">

                                        </div>
                                        </div>
                                    

                                    </div>
                                    <div class="col-5 eventospartido">
                                        <div class="col-12 videopartido" id="video-${idpartido}">
                                            ${video}
                                        </div>
                                        <div style="width:100%;font-weight:bold;padding:0px 5px;text-transform:uppercase;border:1px solid lightgray;background-color:lightgray;" data-i18n="EventosPartido">Eventos Partido</div>
                                        <div style="width:100%;font-size:12px;" id="eventos-${idpartido}"></div>
                                    </div>
                                </div>`
                            $('#partido_' + idpartido).append(cabecerapartido)
                            $('.' + idmodalidad + '-hide').hide()
                            //cargarEventosPartido()
                            var idmodalidad = $('#prmIdModalidad').val()
                            unirseAPartido(idpartido, idmodalidad)
                            //cargarEventosPartido(idpartido)
                            //cargarAlineacionesPartido(idpartido, ideq1, ideq2)
                        }
                        if (info.error == true) {
                            /* Si hemos enviado por JSON un error, lo notificamos */
                            console.log('Error detectado:', info);
                            return;
                        }
                    } catch (error) {
                        /* Si el JSON está mal, notificamos su contenido */
                        console.log('ERROR. Recibido:' + error, response);
                        toastr.error('ERROR. Recibido:' + error, "ERROR")
                    }
                },
                /* En caso de error XHR mostramos el error (pasará los parámetros a console.log) */
                error: function error(_error) {
                    console.log(JSON.stringify(_error));
                }
            });
        });
}
function procesarMarcadorPartido(datos, idpartido) {
    if (datos != "") {
        datos = $.parseJSON(datos, (key, value) => value === null ? "" : value);
        console.log("marcador", datos)
        var template = procesarHtmlMarcadorPartido(datos[0])
        var estadopartido = datos.EstadoPartidoCalc;
        $('.marcador_partido[data-idpartido="' + idpartido + '"]').replaceWith(template)
        if (estadopartido == 2) {
            $('.marcador_partido[data-idpartido="' + idpartido + '"]').off()
            // Manejamos el evento mousedown/touchstart
            let statsShown = false;
            $('.marcador_partido[data-idpartido="' + idpartido + '"]').on('mousedown touchstart', function () {
                var $this = $(this); // Guardar el elemento actual
                var idpartido = $this.data('idpartido'); // Obtener el idpartido del partido clickeado
                var progress = 0;

                // Establecer el borde inferior de 3px al hacer clic
                $this.css({
                    'border-bottom-width': '3px',
                    'border-bottom-style': 'solid',
                    'border-bottom-color': 'transparent',
                    'border-image': 'none',
                    'border-image-slice': '1' // Necesario para el borde-image

                });
                $('.marcador_partido').css("border-bottom-width", "3px")
                // Limpiar cualquier temporizador anterior
                clearInterval(intervalTimer);

                // Intervalo para actualizar el borde inferior gradualmente
                intervalTimer = setInterval(function () {
                    progress += 10; // Incrementa el progreso cada 100ms (ajustable)
                    var gradient = `linear-gradient(to right, var(--primary) ${progress}%, transparent ${progress}%)`;
                    $this.css('border-image', gradient + ' 1'); // Aplicar el gradiente al borde inferior
                    if (progress >= 100) {
                        clearInterval(intervalTimer); // Parar si llega al 100%
                    }
                }, 50); // Ejecutar cada 100ms (0.1 segundo)

                // Temporizador para ejecutar la acción después de medio segundo
                holdTimer = setTimeout(function () {
                    statsShown = true;
                    mostrarEstadisticasPartido(idpartido);
                }, 500);
            }).on('mouseup mouseleave touchend', function () {
                // Limpiar los temporizadores cuando se suelta o el ratón deja el área
                clearTimeout(holdTimer);
                clearInterval(intervalTimer);

                // Volver al estado original después de soltar
                $(this).css({
                    'border-bottom-width': '', // Resetear el borde a su valor inicial
                    'border-image': '', // Resetear el borde a su valor inicial
                    'border-bottom-color': '' // Resetear el color
                });
                $('.marcador_partido').css("border-bottom-width", "")
            }).on("click", function () {
                if (!statsShown) {
                    abrirPartido(idpartido);
                }
            });
        }
    }
}
function procesarHtmlMarcadorPartido(datos) {
    var idpartido = datos.IdPartido;
    var tienelogoeq1 = datos.TieneLogoE1;
    var tienelogoeq2 = datos.TieneLogoE2;
    var logoeq1 = "https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/36x36/sinescudo.png"
    if (tienelogoeq1) {
        var ideq1 = datos.IdEq1;
        logoeq1 = "https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/36x36/" + ideq1 + ".png"
    }
    var logoeq2 = "https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/36x36/sinescudo.png"
    if (tienelogoeq2) {
        var ideq2 = datos.IdEq2;
        logoeq2 = "https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/36x36/" + ideq2 + ".png"
    }
    var nombrejornada = datos.NombreJornada;
    var fecha = moment(datos.Fecha).format("DD/MM");
    var hora = datos.Hora;
    if (hora != "") {
        hora = " - " + hora
    }
    var eq1 = datos.Eq1;
    var eq2 = datos.Eq2;
    var idequipolocal = datos.IdEquipoLocal;
    var idequipovisit = datos.IdEquipoVisit;
    var goleslocal = datos.GolesLocal;
    var golesvisit = datos.GolesVisit;
    var puntobonus = datos.PuntoBonus;
    var bonuslocal = "";
    var bonusvisit = "";
    if (puntobonus != "") {
        if (puntobonus == idequipolocal) {
            bonuslocal = `<i style="color:var(--primary);" class="fa fa-award ms-2" aria-hidden="true"></i>`;
        }
        if (puntobonus == idequipovisit) {
            bonusvisit = `<i style="color:var(--primary);" class="fa fa-award ms-2" aria-hidden="true"></i>`;
        }
    }
    $('#partido_' + idpartido + ' .goles.local').html(goleslocal)
    $('#partido_' + idpartido + ' .goles.visit').html(golesvisit)
    var estadopartido = datos.EstadoPartidoCalc;
    var estado = ""
    var colorestado = ""
    switch (estadopartido) {
        case 2:
            colorestado = "final";
            estado = "FINAL"
            break;
        case 1:
            colorestado = "enjuego";
            estado = "EN JUEGO"
            break;
        case 0:
            estado = "SIN COMENZAR"
            colorestado = "";
            break;
    }
    if (goleslocal === "" && estadopartido == "1") {
        goleslocal = "0"
    } else {
        if (goleslocal === "") {
            goleslocal = "-"
        }
    }
    if (golesvisit === "" && estadopartido == "1") {
        golesvisit = "0"
    } else {
        if (golesvisit === "") {
            golesvisit = "-"
        }
    }


    var template = `<div class="marcador_partido" data-idpartido="${idpartido}"  style="width: 50%; cursor: pointer;">
                        <table style="width: 100%;">
                            <tbody>
                                <tr>
                                    <td class="marcador_partido_bar ${colorestado}">.</td>
                                    <td class="marcador_partido_all">
                                        <div class="marcador_partido_left">
                                            <div class="marcador_equipo_line">
                                                <div class="marcador_equipo_logo">
                                                    <img src="${logoeq1}">
                                                </div>
                                                <div class="marcador_equipo_name">${eq1}${bonuslocal}</div>
                                                <div class="marcador_result">${goleslocal}</div>
                                            </div>
                                            <div class="marcador_equipo_line">
                                                <div class="marcador_equipo_logo">
                                                    <img src="${logoeq2}">
                                                </div>
                                                <div class="marcador_equipo_name">${eq2}${bonusvisit}</div>
                                                <div class="marcador_result">${golesvisit}</div>
                                            </div>
                                        </div>
                                        <div class="marcador_partido_right">
                                            <div class="marcador_partido_right_text" style="font-weight: bold;">${fecha}${hora}</div>
                                            <div class="marcador_partido_right_text">${nombrejornada}</div>
                                            <div class="marcador_partido_right_status ${colorestado}">${estado}</div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>`
    return template
}
function procesarHtmlPartidoNacional(datos) {
    var logoeq1 = datos.LogoLocal;
    var logoeq2 = datos.LogoVisit;
    var raiz ="https://sidgad.cloud/rfep/images/logos_clubes/"
    var nombrejornada = datos.Jornada;
    var fecha = datos.Fecha
    var eq1 = datos.Local;
    var eq2 = datos.Visit;
    var goleslocal = "";
    var golesvisit = "";
    var estado = datos.Estado;
    var colorestado = ""
    var marcador = datos.Marcador;
    switch (estado) {
        case "FINAL":
            colorestado = "final";
            estado = "FINAL";
            break;
        case "":
            colorestado = "";
            estado = "";
            break;
        default:
            estado = "";
            colorestado = "";
            break;
    }
    if(marcador.includes(":") && estado=="FINAL"){
        goles=marcador.split(":")
        goleslocal = goles[0];
        golesvisit=goles[1]
    }
    var template = `<div class="marcador_partido rfep" style="width: 50%; cursor: pointer;" onclick="abrirRFEP();">
                        <table style="width: 100%;">
                            <tbody>
                                <tr>
                                    <td class="marcador_partido_bar ${colorestado}">.</td>
                                    <td class="marcador_partido_all">
                                        <div class="marcador_partido_left">
                                            <div class="marcador_equipo_line">
                                                <div class="marcador_equipo_logo">
                                                    <img src="${logoeq1}">
                                                </div>
                                                <div class="marcador_equipo_name">${eq1}</div>
                                                <div class="marcador_result">${goleslocal}</div>
                                            </div>
                                            <div class="marcador_equipo_line">
                                                <div class="marcador_equipo_logo">
                                                    <img src="${logoeq2}">
                                                </div>
                                                <div class="marcador_equipo_name">${eq2}</div>
                                                <div class="marcador_result">${golesvisit}</div>
                                            </div>
                                        </div>
                                        <div class="marcador_partido_right">
                                            <div class="marcador_partido_right_text" style="font-weight: bold;">${fecha}</div>
                                            <div class="marcador_partido_right_text">${nombrejornada}</div>
                                            <div class="marcador_partido_right_status ${colorestado}">${estado}</div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>`
    return template
}
function procesarEventosPartido(datos, idpartido) {
    if (datos != "") {
        console.log("pasamos", idpartido)
        var html = ""
        var goleslocal = 0
        var golesvisit = 0
        var faltaslocal = 0
        var faltasvisit = 0
        datos = $.parseJSON(datos, (key, value) => value === null ? "" : value);
        $(datos).each(function () {
            var crono = this.Crono;
            var codperiodo = this.CodPeriodo;
            var idtipoevento = this.IdTipoEvento;
            var eq = this.Eq;
            var identidadequipo = this.IdEntidadEquipo;
            var logo = `<img src="https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/36x36/${identidadequipo}.png" style="width:22px;">`
            var lic1 = this.Lic1;
            var lic2 = this.Lic2;
            var idlicencia1 = this.IdLicencia1;
            var idlicencia2 = this.IdLicencia2;
            var dorsal1 = this.Dorsal1;
            var dorsal2 = this.Dorsal2;
            var localvisit = this.LocalVisit;
            var icono = ""
            var evento = ""
            var codigo = this.Codigo;
            var minsancion = this.MinSancion;
            switch (idtipoevento) {
                case "gol":
                    if (localvisit == 1) {
                        goleslocal += 1
                    }
                    if (localvisit == 2) {
                        golesvisit += 1
                    }
                    if (dorsal1 != "") {
                        evento = `<span style="color:#1d2553;font-weight:bold;">GOL: <a href="javascript:void(0)" class="link-color" onclick="openStatsJugador('${idlicencia1}','j',$('#prmIdModalidad').val())">#${dorsal1} ${lic1}</a></span>`
                    } else {
                        evento = `<span style="color:#1d2553;font-weight:bold;">GOL</span>`
                    }
                    if (dorsal1 != "" && dorsal2 != "") {
                        evento += `<br><span style="color:#1d2553; font-weight: 500; ">ASISTE: <a href="javascript:void(0)" class="link-color" onclick="openStatsJugador('${idlicencia2}','j',$('#prmIdModalidad').val())">#${dorsal2} ${lic2}</a></span>`
                    }
                    //if (codigo != "") {
                    //    eventotrad += "<br>(" + codigo + ")"
                    //}
                    icono = `<i class="fa fa-goal-net"></i><br><span>${goleslocal}-${golesvisit}</span>`
                    break;
                case "falta":
                    var faltas
                    if (localvisit == 1) {
                        faltaslocal += 1
                        faltas = faltaslocal
                    }
                    if (localvisit == 2) {
                        faltasvisit += 1
                        faltas = faltasvisit
                    }

                    if (dorsal1 != "") {
                        evento = `<span style="color:red;font-weight:bold;"><span data-i18n="Falta">FALTA</span>:<a href="javascript:void(0)" class="link-color" onclick="openStatsJugador('${idlicencia1}','j',$('#prmIdModalidad').val())">#${dorsal1} ${lic1}</a></span>`
                    } else {
                        evento = `<span style="color:red;font-weight:bold;" data-i18n="Falta">FALTA</span>`
                    }
                    if (dorsal1 != "" && dorsal2 != "") {
                        evento += `<br><span style="color:black; font-weight: 500; "><span data-i18n="Recibe">RECIBE</span>:<a href="javascript:void(0)" class="link-color" onclick="openStatsJugador('${idlicencia2}','j',$('#prmIdModalidad').val())">#${dorsal2} ${lic2}</a></span>`
                    }
                    icono = `<i class="fa fa-whistle"></i><br><span style="border:1px solid black;padding:2px 6px;border-radius:3px;background-color:white;">${faltas}</span>`
                    break;
                case "falta-hl":
                    if (dorsal1 != "") {
                        evento = `<span style="color:red;font-weight:bold;"><span data-i18n="Falta">FALTA</span>:<a href="javascript:void(0)" class="link-color" onclick="openStatsJugador('${idlicencia1}','j',$('#prmIdModalidad').val())">#${dorsal1} ${lic1}</a></span>`
                    } else {
                        evento = `<span style="color:red;font-weight:bold;" data-i18n="Falta">FALTA</span>`
                    }
                    if (dorsal1 != "" && dorsal2 != "") {
                        evento += `<br><span style="color:black; font-weight: 500; "><span data-i18n="Recibe">RECIBE</span>:<a href="javascript:void(0)" class="link-color" onclick="openStatsJugador('${idlicencia2}','j',$('#prmIdModalidad').val())">#${dorsal2} ${lic2}</a></span>`
                    }
                    evento += `<br><span style="font-weight:bold;">${codigo}<i class='fa-solid fa-person-walking-arrow-right mx-2'></i>${minsancion} min.</span>`
                    icono = '<i class="fa fa-whistle"></i>'
                    break;
                case "tm":
                    evento = `<span class="text-uppercase fw-bold" data-i18n="TiempoMuerto">Tiempo muerto</span>`
                    icono = '<i class="fa fa-stopwatch" style="font-size:18px;"></i>'
                    break;
                case "amonestacionverbal":
                    evento = `<span data-i18n="AmonestacionVerbal" style="font-weight:bold;color:red;">AMONESTACION VERBAL</span><br><span style="font-weight:500;"><a href="javascript:void(0)" class="link-color" onclick="openStatsJugador('${idlicencia1}','j',$('#prmIdModalidad').val())">#${dorsal1} ${lic1}</a></span>`
                    icono = '<i class="fa fa-face-shush" style="font-size:18px;"></i>'
                    break;
                case "cambio":
                    evento = `<span style="font-weight:500;"><span data-i18n="Entra" style="font-weight:bold;">ENTRA</span>:#<a href="javascript:void(0)" class="link-color" onclick="openStatsJugador('${idlicencia1}','j',$('#prmIdModalidad').val())">#${dorsal1} ${lic1}</a></span><br><span style="font-weight:500;"><span data-i18n="Entra" style="font-weight:bold;">SALE</span>:#${dorsal2} ${lic2}</span>`
                    icono = '<i class="fa fa-right-left" style="font-size:18px;"></i>'
                    break;
                case "tarjetaazul":
                    var colortarjeta = "#0707b5"
                    icono = '<i class="fa fa-solid fa-cards-blank" style="font-size:18px;"></i>'
                    evento = `<span style="font-weight:500;"><span data-i18n="TarjetaAzul" style="font-weight:bold;color:red;">TARJETA AZUL</span></span><br><i class="fa fa-solid fa-cards-blank" style="margin-right:0.75em;color: ${colortarjeta}"></i><a href="javascript:void(0)" class="link-color" onclick="openStatsJugador('${idlicencia1}','j',$('#prmIdModalidad').val())">#${dorsal1} ${lic1}</a>`
                    break;
                case "tarjetaroja":
                    var colortarjeta = "red"
                    icono = '<i class="fa fa-solid fa-cards-blank" style="font-size:18px;"></i>'
                    evento = `<span style="font-weight:500;"><span data-i18n="TarjetaRoja" style="font-weight:bold;color:red;">TARJETA ROJA</span></span><br><i class="fa fa-solid fa-cards-blank" style="margin-right:0.75em;color: ${colortarjeta}"></i>#<a href="javascript:void(0)" class="link-color" onclick="openStatsJugador('${idlicencia1}','j',$('#prmIdModalidad').val())">#${dorsal1} ${lic1}</a>`
                    break;
                case "tarjetaamarilla":
                    var colortarjeta = "yellow"
                    icono = '<i class="fa fa-solid fa-cards-blank" style="font-size:18px;"></i>'
                    evento = `<span style="font-weight:500;"><span data-i18n="TarjetaAmarilla" style="font-weight:bold;color:red;">TARJETA AMARILLA</span></span><br><i class="fa fa-solid fa-cards-blank" style="margin-right:0.75em;color: ${colortarjeta}"></i><a href="javascript:void(0)" class="link-color" onclick="openStatsJugador('${idlicencia1}','j',$('#prmIdModalidad').val())">#${dorsal1} ${lic1}</a>`
                    break;
                case "penalti":
                    if (dorsal1 != "") {
                        evento = evento = `<span style="color:red;font-weight:bold;" data-i18n="Penalti">PENALTI</span><br><span style="color:black;font-weight:500;margin-right:4px;"><span data-i18n="Lanza">LANZA</span>:</span><a href="javascript:void(0)" class="link-color" onclick="openStatsJugador('${idlicencia1}','j',$('#prmIdModalidad').val())">#${dorsal1} ${lic1}</a></span>`
                        evento += "<br>(" + codigo + ")"
                    }
                    icono = '<i class="fa fa-whistle" style="font-size:18px;"></i>'
                    break;
                case "faltadirecta":
                    if (dorsal1 != "") {
                        evento = evento = `<span style="color:red;font-weight:bold;" data-i18n="FaltaDirecta">FALTA DIRECTA</span><br><span style="color:black;font-weight:500;margin-right:4px;"><span data-i18n="Lanza">LANZA</span>:</span><a href="javascript:void(0)" class="link-color" onclick="openStatsJugador('${idlicencia1}','j',$('#prmIdModalidad').val())">#${dorsal1} ${lic1}</a></span>`
                        evento += "<br>(" + codigo + ")"
                    }
                    icono = '<i class="fa fa-whistle" style="font-size:18px;"></i>'
                    break;
            }
            var template = `<div style="width:100%;display:flex;border:1px solid lightgray;border-collapse:collapse;">
                                                <div class="ev-crono" style="text-align:center;width:10%;font-weight:bold;background-color:rgb(255, 75, 68);color:white;">
                                                    ${codperiodo}<br>
                                                    ${crono}
                                                </div>
                                                <div class="ev-icono" style="align-content:center;line-height:22px;text-align:center;width:10%;font-weight:bold;background-color:#ededed;">
                                                    ${icono}
                                                </div>
                                                <div class="ev-logo" style="align-content:center;text-align:center;width:10%;">
                                                    ${logo}<br>
                                                    <span style="font-weight:bold;">${eq}</span>
                                                </div>
                                                <div class="ev-evento text-uppercase" style="align-content:center;width:70%;line-height:18px;">
                                                    ${evento}
                                                </div>
                                            </div>`
            html = template + html
        })
        contadorFaltas(idpartido, faltaslocal, faltasvisit)
        if ($('.estadopartido_' + idpartido + '.final').length == 1 || $('.estadopartido_' + idpartido + '.sincomenzar').length == 1) {

        } else {
            //$('#partido_' + idpartido + " .goles.local").html(goleslocal)
            //$('#partido_' + idpartido + " .goles.visit").html(golesvisit)
        }
        $('#eventos-' + idpartido).html(html)
    }
}
function procesarPenaltisPartido(datos, idpartido) {
    console.log("penaltis",datos)
    if (datos != "") {
        datos = $.parseJSON(datos, (key, value) => value === null ? "" : value);
        $('.penaltispartido').show()
        $('.divpenaltislocal').html("")
        $('.divpenaltisvisit').html("")
        console.log("penaltis", datos)
        var ideq1 = $('#ideq1_' + idpartido).val()
        var ideq2 = $('#ideq2_' + idpartido).val()
        console.log(ideq1)
        const penaltislocal = $(datos).filter((_, item) => item.IdEquipo === parseInt(ideq1)).toArray();
        const penaltisvisit = $(datos).filter((_, item) => item.IdEquipo === parseInt(ideq2)).toArray();
        console.log(penaltislocal)
        console.log(penaltisvisit)
        $(penaltislocal).each(function () {
            var dorsal = this.Dorsal;

            var idlicencia = this.IdLicencia;
            var idequipo = this.IdEquipo;
            var idlanzamiento = this.IdLanzamiento;
            var gol = this.Gol;
            var nombreapellidos = this.NombreApellidos;
            var colorgol = ""
            switch (gol) {
                case true:
                    gol = `<i class='fa-solid fa-square-check' style="color:green;font-size:23px;"></i >`
                    break;
                case false:
                    gol = `<i class="fa-solid fa-square-xmark" style="color:red;font-size:23px;"></i>`
                    break;
                case "":
                    gol = `<i class='fa-solid fa-square' style="color:lightgrey;font-size:23px"></i >`
            }
            var template = `<div style="display: flex; flex-direction: column; width: 100%;">
                                <div style="height: 100%;display: flex; align-items: center; border: 1px solid lightgray; color: white; font-weight: 500;">
                                    <div style="width: 10%; text-align: center; color: black; font-weight: bold;">${dorsal}</div> 
                                    <div style="width: 80%; text-align: left;color: black;font-size:12px;white-space: nowrap;overflow: hidden;text-overflow: ellipsis;">
                                        ${nombreapellidos}
                                    </div>
                                    <div style="width: 10%; text-align: center; height: 100%; align-content: center;" class="text-bold-700">${gol}</div>
                                </div>
                            </div>`
            $('.divpenaltislocal').prepend(template)
        })
        $(penaltisvisit).each(function () {

            var dorsal = this.Dorsal;
            console.log(dorsal)
            var idlicencia = this.IdLicencia;
            var idequipo = this.IdEquipo;
            var idlanzamiento = this.IdLanzamiento;
            var gol = this.Gol;
            var nombreapellidos = this.NombreApellidos;
            var colorgol = ""
            switch (gol) {
                case true:
                    gol = `<i class='fa-solid fa-square-check' style="color:green;font-size:23px;"></i >`
                    break;
                case false:
                    gol = `<i class="fa-solid fa-square-xmark" style="color:red;font-size:23px;"></i>`
                    break;
                case "":
                    gol = `<i class='fa-solid fa-square' style="color:lightgrey;font-size:23px"></i >`
            }
            var template = `<div style="display: flex; flex-direction: column; width: 100%;">
                                <div style="height: 100%;display: flex; align-items: center; border: 1px solid lightgray; color: white; font-weight: 500;">
                                    <div style="width: 10%; text-align: center; height: 100%; align-content: center;" class="text-bold-700">${gol}</div>
                                    <div style="width: 80%; text-align: right;color: black;font-size:12px;white-space: nowrap;overflow: hidden;text-overflow: ellipsis;">
                                            ${nombreapellidos}
                                    </div>
                                    <div style="width: 10%; text-align: center; color: black; font-weight: bold;">${dorsal}</div>    
                                </div>
                            </div>`
            $('.divpenaltisvisit').prepend(template)
        })
    }
    else {
        $('.penaltispartido').hide()
    }
}
function procesarAlinPartido(datos, idpartido) {
    var htmljuglocal = ""
    var htmljugvisit = ""
    var htmlportlocal = ""
    var htmlportvisit = ""
    var htmltecnlocal = ""
    var htmltecnvisit = ""
    if (datos != "") {
        datos = $.parseJSON(datos, (key, value) => value === null ? "" : value);
        console.log('alin',datos)
        if (datos[0].JugLocal) {
            htmljuglocal = procesarAlinJug(datos[0].JugLocal)
        }
        if (datos[0].JugVisit) {
            htmljugvisit = procesarAlinJug(datos[0].JugVisit)
        }
        if (datos[0].PortLocal) {
            htmlportlocal = procesarAlinPort(datos[0].PortLocal)
        }
        if (datos[0].PortVisit) {
            htmlportvisit = procesarAlinPort(datos[0].PortVisit)
        }
        if (datos[0].TecnLocal) {
            htmltecnlocal = procesarAlinTecn(datos[0].TecnLocal)
        }
        if (datos[0].TecnVisit) {
            htmltecnvisit = procesarAlinTecn(datos[0].TecnVisit)
        }
    }
    $('#alin-' + idpartido + ' .juglocal').html(htmljuglocal)
    $('#alin-' + idpartido + ' .jugvisit').html(htmljugvisit)
    $('#alin-' + idpartido + ' .portlocal').html(htmlportlocal)
    $('#alin-' + idpartido + ' .portvisit').html(htmlportvisit)
    $('#alin-' + idpartido + ' .tecnlocal').html(htmltecnlocal)
    $('#alin-' + idpartido + ' .tecnvisit').html(htmltecnvisit)
    var equipolocal = $('#partido_' + idpartido + ' .equipo1').text()
    var equipovisit = $('#partido_' + idpartido + ' .equipo2').text()
    $('#alin-' + idpartido + ' .eq-alin').eq(0).html(equipolocal)
    $('#alin-' + idpartido + ' .eq-alin').eq(1).html(equipovisit)
}
function procesarCronoPartido(datos, idpartido) {
    if (datos != "") {
        prm = $.parseJSON(datos, (key, value) => value === null ? "" : value);
        console.log(prm)
        var part = prm[0]
        var ideq1 = part.IdEquipoLocal;
        var ideq2 = part.IdEquipoVisit;
        var crono = ""
        var periodo = i18next.t(part.Periodo);
        if (part.Periodo == "Final" || part.Periodo == 'SinComenzar') {

        } else {
            crono = "<i class='fa-light fa-clock me-2'></i>" + part.Crono + "<i class='fa-light fa-clock ms-2'></i>"
        }
        periodo = `<div class="badge badge-dark text-uppercase" style="font-size: 14px;">
                        ${periodo}
                    </div>`
        $('.estadopartido_' + idpartido).html(periodo)
        $('.cronopartido_' + idpartido).html(crono)
    }
}
function procesarAlinJug(datos) {
    var idmodalidad = $('#prmIdModalidad').val()

    var template=""
    if (idmodalidad == 'hp') {
        var html=""
        $(datos).each(function () {
            var dorsal = this.Dorsal;
            var apellidosnombre = this.ApellidosNombre;
            var inicial = this.Inicial;
            var capitan = this.Capitan;
            if (capitan) {
                capitan = "<span style='font-weight:bold;margin-left:5px;'>(C)</span>"
            } else {
                capitan = ""
            }
            if (inicial) {
                inicial = "<i class='fa fa-circle' style='color:var(--primary);'></i>"
            } else {
                inicial=""
            }
            var goles = this.Goles;
            var asist = this.Asist;
            var golpenalti = this.GolPenalti;
            var tirospenalti = this.TirosPenalti;
            var penalti = ""
            if (tirospenalti != "") {
                penalti=golpenalti + "/" + tirospenalti
            }
            var golfd = this.GolFD;
            var tirosfd = this.TirosFD;
            var fd = ""
            if (tirosfd != "") {
                fd = golfd + "/" + tirosfd
            }
            var faltareal = this.FaltaReal;
            var faltarec = this.FaltaRec;
            var azules = this.Azules;
            var rojas = this.Rojas;
            var minutos = this.Minutos;
            var idlicencia = this.IdLicencia;
            if (minutos == 0) {
                minutos = ""
            }
            var rowhtml = `<tr id="trstats_${idlicencia}">
			                    <td align="center" width="30">${dorsal}</td>
			                    <td align="center" width="30">${inicial}</td>
			                    <td style="padding-left: 5px;">
				                    <div style="float: left;font-weight:600;cursor:pointer;" onclick="openStatsJugador('${idlicencia}','j',$('#prmIdModalidad').val())">
					                    ${apellidosnombre}${capitan}
                                    </div>
			                    </td>
			                    <td>${goles}</td>
			                    <td>${asist}</td>
			                    <td>${penalti}</td>	
			                    <td>${fd}</td>	
			                    <td>${faltareal}</td>	
			                    <td>${faltarec}</td>	
			                    <td>${azules}</td>	
			                    <td>${rojas}</td>
                                <td style="font-weight:600;color:red;">${minutos}</td>
		                    </tr>`
            html+=rowhtml
        })
        template =`<table width="100%" class="table tblEstadisticas mb-0 table-hover nowrap custom-table">
		                <thead>
                            <tr>
				                <td colspan="12" style="font-size: 12px; padding: 3px 0px 3px 10px;" class="team_name_game_report">
					                <div style="float:left;" class="eq-alin"></div>
				                </td>
			                </tr>
			                <tr style="border-bottom: 2px solid #BBB;">
				                <th>Nº</th>
				                <th>5i</th>
				                <th style="text-align: left; padding-left: 20px;">
					                <span style="display: inline;" data-i18n="Nombre">Nombre</span>
				                </th>
				                <th width="30">G</th>
				                <th width="30">As</th>
				                <th width="30">
					                <span style="display: inline;">Pe</span>
				                </th>
				                <th width="30">
					                <span style="display: inline;">FD</span>
				                </th>
				                <th width="30">F-&gt;</th>
				                <th width="30">F&lt;-</th>
				                <th width="30">
					                <span style="display: inline;">Az</span>
				                </th>
				                <th width="30">
					                <span style="display: inline;">Rj</span>
				                </th>
                                <th width="30">
					                <span style="display: inline;">Min.</span>
				                </th>
			                </tr>
		                </thead>
		                <tbody>
                        ${html}
		                </tbody>
	                </table>`

    }
    if (idmodalidad == 'hl') {
        var html = ""
        $(datos).each(function () {
            var dorsal = this.Dorsal;
            var capitan = this.Capitan;
            if (capitan) {
                capitan = "C"
            } else {
                capitan=""
            }
            var asistcap = this.AsistCap;
            if (asistcap) {
                asistcap = "A"
            } else {
                asistcap=""
            }
            var posicion=capitan + asistcap
            var apellidosnombre = this.ApellidosNombre;
            var inicial = this.Inicial;
            if (inicial) {
                inicial = "<i class='fa fa-circle' style='color:var(--primary);'></i>"
            } else {
                inicial = ""
            }
            var goles = this.Goles;
            var asist = this.Asist;
            var faltareal = this.FaltaReal;
            var faltarec = this.FaltaRec;
            var minutos = this.Minutos;
            var idlicencia = this.IdLicencia;
            if (minutos == 0) {
                minutos = ""
            }
            var rowhtml = `<tr id="trstats_${idlicencia}">
			                    <td align="center" width="30">${dorsal}</td>
                                <td align="center" width="30">${posicion}</td>
			                    <td align="center" width="30">${inicial}</td>
			                    <td style="padding-left: 5px;">
				                    <div style="float: left;font-weight:600;" onclick="openStatsJugador('${idlicencia}','j',$('#prmIdModalidad').val())">
					                    ${apellidosnombre}
                                    </div>
			                    </td>
			                    <td>${goles}</td>
			                    <td>${asist}</td>
			                    <td>${faltareal}</td>	
			                    <td>${faltarec}</td>	
                                <td style="font-weight:600;color:red;">${minutos}</td>
		                    </tr>`
            html += rowhtml
        })
        template = `<table width="100%" class="table tblEstadisticas mb-0 table-hover nowrap custom-table">
		                <thead>
                            <tr>
				                <td colspan="11" style="font-size: 12px; padding: 3px 0px 3px 10px;" class="team_name_game_report">
					                <div style="float:left;" class="eq-alin"></div>
				                </td>
			                </tr>
			                <tr style="border-bottom: 2px solid #BBB;">
				                <th>Nº</th>
                                <th>Pos</th>
				                <th>6i</th>
				                <th style="text-align: left; padding-left: 20px;">
					                <span style="display: inline;" data-i18n="Nombre">Nombre</span>
				                </th>
				                <th width="30">G</th>
				                <th width="30">As</th>
				                <th width="30">F-&gt;</th>
				                <th width="30">F&lt;-</th>
                                <th width="30">
					                <span style="display: inline;">Min.</span>
				                </th>
			                </tr>
		                </thead>
		                <tbody>
                        ${html}
		                </tbody>
	                </table>`
    }
    return template
}
function procesarAlinPort(datos) {
    var idmodalidad = $('#prmIdModalidad').val()

    var template = ""
    if (idmodalidad == 'hp') {
        var html = ""
        $(datos).each(function () {
            var dorsal = this.Dorsal;
            var apellidosnombre = this.ApellidosNombre;
            var inicial = this.Inicial;
            var capitan = this.Capitan;
            if (capitan) {
                capitan = "<span style='font-weight:bold;margin-left:5px;'>(C)</span>"
            } else {
                capitan = ""
            }
            if (inicial) {
                inicial = "<i class='fa fa-circle' style='color:var(--primary);'></i>"
            } else {
                inicial = ""
            }
            var goles = this.Goles;
            if (goles == "") {
                goles=0
            }
            var paradas = this.Paradas;
            console.log("paradas", paradas)
            if (paradas == "") {
                paradas=0
            }

            paradas += goles
            var porcparadas = ""
            if (goles != 0 || paradas != 0) {
                porcparadas = 1 - (goles / paradas)
            }
            if (porcparadas != "") {
                porcparadas = ((porcparadas) * 100).toFixed(2) + "%"
            } else {
                porcparadas = ""
            }
            //if (porcparadas != 0) {
            //    porcparadas = ((porcparadas) * 100).toFixed(2) + "%"
            //} else {
            //    portparadas=""
            //}
            if (paradas == 0) {
                paradas=""
            }
            if (goles == 0) {
                goles=""
            }
            var faltareal = this.FaltaReal;
            var faltarec = this.FaltaRec;
            var azules = this.Azules;
            var rojas = this.Rojas;
            var minutos = this.Minutos;
            var idlicencia = this.IdLicencia;
            if (minutos == 0) {
                minutos = ""
            }
            var rowhtml = `<tr id="trstats_${idlicencia}">
			                    <td align="center" width="30">${dorsal}</td>
			                    <td align="center" width="30">${inicial}</td>
			                    <td style="padding-left: 5px;">
				                    <div style="float: left;font-weight:600;" onclick="openStatsJugador('${idlicencia}','p',$('#prmIdModalidad').val())">
					                    ${apellidosnombre}${capitan}
                                    </div>
			                    </td>
			                    <td>${goles}</td>
			                    <td>${paradas}</td>
			                    <td>${porcparadas}</td>	
			                    <td>${faltareal}</td>	
			                    <td>${faltarec}</td>	
			                    <td>${azules}</td>	
			                    <td>${rojas}</td>
                                <td style="font-weight:600;color:red;">${minutos}</td>
		                    </tr>`
            html += rowhtml
        })
        template = `<table width="100%" class="table tblEstadisticas mt-0 mb-0 table-hover nowrap custom-table">
		                <thead>
			                <tr style="border-bottom: 2px solid #BBB;background-color: lightgray;color:#777;">
				                <th style="padding:0px 10px;text-align:left;" colspan="3">Porteros/as</th>
				                <th style="padding:0px;" width="30">G</th>
				                <th style="padding:0px;" width="30">Tir</th>
				                <th style="padding:0px;" width="30">
					                <span style="display: inline;">%</span>
				                </th>
				                <th style="padding:0px;" width="30">F-&gt;</th>
				                <th style="padding:0px;" width="30">F&lt;-</th>
				                <th style="padding:0px;" width="30">
					                <span style="display: inline;">Az</span>
				                </th>
				                <th style="padding:0px;" width="30">
					                <span style="display: inline;">Rj</span>
				                </th>
                                <th width="30">
					                <span style="display: inline;">Min.</span>
				                </th>
			                </tr>
		                </thead>
		                <tbody>
                        ${html}
		                </tbody>
	                </table>`

    }
    if (idmodalidad == 'hl') {
        var html = ""
        $(datos).each(function () {
            var dorsal = this.Dorsal;
            var apellidosnombre = this.ApellidosNombre;
            var inicial = this.Inicial;
            if (inicial) {
                inicial = "<i class='fa fa-circle' style='color:var(--primary);'></i>"
            } else {
                inicial = ""
            }
            var goles = this.Goles;
            if (goles == "") {
                goles = 0
            }
            var paradas = this.Paradas;
            if (paradas == "") {
                paradas = 0
            }
            paradas += goles
            var porcparadas = ""
            if (goles != 0 || paradas != 0) {
                porcparadas = 1 - (goles / paradas)
            }
            if (porcparadas != "" && porcparadas != "") {
                porcparadas = ((porcparadas) * 100).toFixed(2) + "%"
            } else {
                porcparadas=""
            }
            if (paradas == 0) {
                paradas = ""
            }
            if (goles == 0) {
                goles = ""
            }
            var faltareal = this.FaltaReal;
            var faltarec = this.FaltaRec;
            var minutos = this.Minutos;
            var idlicencia = this.IdLicencia;
            if (minutos == 0) {
                minutos = ""
            }
            var rowhtml = `<tr id="trstats_${idlicencia}">
			                    <td align="center" width="30">${dorsal}</td>
			                    <td align="center" width="30">${inicial}</td>
			                    <td style="padding-left: 5px;">
				                    <div style="float: left;font-weight:600;" onclick="openStatsJugador('${idlicencia}','p',$('#prmIdModalidad').val())">
					                    ${apellidosnombre}
                                    </div>
			                    </td>
			                    <td>${goles}</td>
			                    <td>${paradas}</td>
			                    <td>${porcparadas}</td>	
			                    <td>${faltareal}</td>	
			                    <td>${faltarec}</td>
                                <td style="font-weight:600;color:red;">${minutos}</td>
		                    </tr>`
            html += rowhtml
        })
        template = `<table width="100%" class="table tblEstadisticas mt-0 mb-0 table-hover nowrap custom-table">
		                <thead>
			                <tr style="border-bottom: 2px solid #BBB;background-color: lightgray;color:#777;">
				                <th style="padding:0px 10px;text-align:left;" colspan="3">Porteros/as</th>
				                <th style="padding:0px;" width="30">G</th>
				                <th style="padding:0px;" width="30">Tir</th>
				                <th style="padding:0px;" width="30">
					                <span style="display: inline;">%</span>
				                </th>
				                <th style="padding:0px;" width="30">F-&gt;</th>
				                <th style="padding:0px;" width="30">F&lt;-</th>
                                <th width="30">
					                <span style="display: inline;">Min.</span>
				                </th>
			                </tr>
		                </thead>
		                <tbody>
                        ${html}
		                </tbody>
	                </table>`
    }
    return template
}
function procesarAlinTecn(datos) {
    var idmodalidad = $('#prmIdModalidad').val()

    var template = ""
    if (idmodalidad == 'hp') {
        var html = ""
        $(datos).each(function () {
            var idposicion = this.IdPosicion;
            var apellidosnombre = this.ApellidosNombre;
            switch (idposicion) {
                case 3:
                    idposicion="ENT"
                    break;
                case 4:
                    idposicion="ENT2"
                    break;
                case 5:
                    idposicion="DEL"
                    break;
                case 6:
                    idposicion = "AUX"
                    break;
            }
            var posicion=`<span class="badge badge-dark badge-sm">${idposicion}</span>`
            var azules = this.Azules;
            var rojas = this.Rojas;
            var rowhtml = `<tr>
			                    <td align="center" width="60">${posicion}</td>
			                    <td style="padding-left: 5px;">
				                    <div style="float: left;">
					                    ${apellidosnombre}
                                    </div>
			                    </td>
			                    <td>${azules}</td>	
			                    <td>${rojas}</td>
                                
		                    </tr>`
            html += rowhtml
        })
        template = `<table width="100%" class="table tblEstadisticas mt-0 mb-0 table-hover nowrap custom-table">
		                <thead>
			                <tr style="border-bottom: 2px solid #BBB;background-color: lightgray;color:#777;">
				                <th style="padding:0px 10px;text-align:left;" colspan="2">Cuerpo técnico</th>
				                <th style="padding:0px;" width="30">
					                <span style="display: inline;">Az</span>
				                </th>
				                <th style="padding:0px;" width="30">
					                <span style="display: inline;">Rj</span>
				                </th>
			                </tr>
		                </thead>
		                <tbody>
                        ${html}
		                </tbody>
	                </table>`

    }
    if (idmodalidad == 'hl') {
        var html = ""
        $(datos).each(function () {
            var idposicion = this.IdPosicion;
            var apellidosnombre = this.ApellidosNombre;
            switch (idposicion) {
                case 3:
                    idposicion = "ENT"
                    break;
                case 4:
                    idposicion = "ENT2"
                    break;
                case 5:
                    idposicion = "DEL"
                    break;
                case 6:
                    idposicion = "AUX"
                    break;
            }
            var posicion = `<span class="badge badge-dark badge-sm">${idposicion}</span>`
            var rowhtml = `<tr>
			                    <td align="center" width="60">${posicion}</td>
			                    <td style="padding-left: 5px;">
				                    <div style="float: left;">
					                    ${apellidosnombre}
                                    </div>
			                    </td>
		                    </tr>`
            html += rowhtml
        })
        template = `<table width="100%" class="table tblEstadisticas mt-0 mb-0 table-hover nowrap custom-table">
		                <thead>
			                <tr style="border-bottom: 2px solid #BBB;background-color: lightgray;color:#777;">
				                <th style="padding:0px 10px;text-align:left;" colspan="2">Cuerpo técnico</th>
			                </tr>
		                </thead>
		                <tbody>
                        ${html}
		                </tbody>
	                </table>`
    }
    return template
}
function openStatsJugador(idlicencia) {
    alert("Creo estadísticas del jugador " + idlicencia)
}
function contadorFaltas(idpartido,faltaslocal, faltasvisit) {
    // Formateamos los valores para que siempre tengan dos dígitos
    let faltasLocalFormatted = faltaslocal.toString().padStart(2, '0');
    let faltasVisitFormatted = faltasvisit.toString().padStart(2, '0');

    // Asigna los valores a los spans del equipo local
    $(".marcador_" + idpartido + " .equipo.local .panelfalta span").eq(0).text(faltasLocalFormatted[0]);
    $(".marcador_" + idpartido + " .equipo.local .panelfalta span").eq(1).text(faltasLocalFormatted[1]);

    // Asigna los valores a los spans del equipo visitante
    $(".marcador_" + idpartido + " .equipo.visit .panelfalta span").eq(0).text(faltasVisitFormatted[0]);
    $(".marcador_" + idpartido + " .equipo.visit .panelfalta span").eq(1).text(faltasVisitFormatted[1]);
}
function unirseAPartido(idpartido, idmodalidad) {
    if ($.connection.hub.state === $.signalR.connectionState.connected) {
        hubProxy.server.unirseAPartido(idpartido, idmodalidad)
            .done(eventosActuales => {
                console.log(`Unido al partido ${idpartido} con modalidad ${idmodalidad}`);
                if (!partConectados.includes(idpartido)) {
                    partConectados.push(idpartido);
                }
            })
            .fail(err => console.error("Error al unirse al partido:", err));
    } else {
        console.error("No se puede unir al partido. La conexión no está establecida.");
    }
}
function salirDePartido(idpartido) {
    if ($.connection.hub.state === $.signalR.connectionState.connected) {
        hubProxy.server.salirDePartido(idpartido)
            .done(() => {
                console.log(`Desconectado del partido ${idpartido}`);
                // Remover el grupo de la lista
                const index =partConectados.indexOf(idpartido);
                if (index > -1) {
                    partConectados.splice(index, 1);
                }
            })
            .fail(err => console.error("Error al salir del partido:", err));
    } else {
        console.error("No se puede salir del partido. La conexión no está establecida.");
    }
}
function unirseAModalidad() {
    var idmodalidad = $('#prmIdModalidad').val()
    if ($.connection.hub.state === $.signalR.connectionState.connected) {
        hubProxy.server.joinGroup(idmodalidad)
            .done(eventosActuales => {
                console.log(`Unido a la modalidad ${idmodalidad}`);
            })
            .fail(err => console.error("Error al unirse al partido:", err));
    } else {
        console.error("No se puede unir a la modalidad. La conexión no está establecida.");
    }
}
// FIN SIGNAL R



















function cargarEquipos() {
    cargando()
    var url = window.location.href;
    var segments = url.split('/'); 
    var idmodalidad = segments[segments.length - 1];
    if (idmodalidad === '') {
        idmodalidad = segments[segments.length - 2];
    }
    if (!isNaN(idmodalidad) && idmodalidad.trim() !== '') {
        
    } else {
        idmodalidad=0
    }
    var html = ""
    var parametros = {
        idmodalidad: idmodalidad
    };
    parametros = JSON.stringify(parametros);
    $(function () {
        $.ajax({
            type: "POST",
            url: "/webservices/WSWeb.asmx/GetEquiposModalidadEntidad",
            data: parametros,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function success(response) {
                try {
                    /*Si el JSON está mal formado se generará una excepción */
                    var info = response;
                    var datos = response.d;
                    if (datos == "") {
                        var msg = i18next.t("msgSinEquiposEnModalidad")
                        html = `<div><h2>${msg}</h2><div>`
                        $('.teamsCards').html(html)
                    } else {
                        datos = $.parseJSON(datos)
                        $(datos).each(function (i) {
                            if (i == 0) {
                                var modalidad = this.I18ModalidadReducida;
                                console.log(modalidad)
                                modalidad=i18next.t(modalidad)
                                $('.tituloModalidad').html(modalidad)
                            }
                            var identidad = this.IdEntidad;
                            var denoequipo = this.DenoAbreviada;
                            var tienelogo = this.TieneLogo;
                            var municipio = this.Municipio;
                            var provincia = this.Provincia;
                            var twitter = this.Twitter;
                            var totalcontactos = this.TotalContactos;
                            var elem_twitter = ""
                            if (twitter != "") {
                                elem_twitter = `<li class="social-icons-twitter"><a href="${twitter}" target="_blank" title="Twitter"><i class="fab fa-twitter"></i></a></li>`
                            }
                            var facebook = this.Facebook;
                            var elem_facebook = ""
                            if (facebook != "") {
                                elem_facebook = `<li class="social-icons-facebook"><a href="${facebook}" target="_blank" title="Facebook"><i class="fab fa-facebook-f"></i></a></li>`
                            }
                            var instagram = this.Instagram;
                            var elem_instagram = ""
                            if (instagram != "") {
                                elem_instagram = `<li class="social-icons-instagram"><a href="${instagram}" target="_blank" title="Instagram"><i class="fab fa-instagram"></i></a></li>`
                            }
                            var youtube = this.Youtube;
                            var elem_youtube = ""
                            if (youtube != "") {
                                elem_youtube = `<li class="social-icons-youtube"><a href="${youtube}" target="_blank" title="Youtube"><i class="fab fa-youtube"></i></a></li>`
                            }
                            var pinterest = this.Pinterest;
                            var elem_pinterest = ""
                            if (pinterest != "") {
                                elem_pinterest = `<li class="social-icons-pinterest"><a href="${pinterest}" target="_blank" title="Pinterest"><i class="fab fa-pinterest"></i></a></li>`
                            }
                            var tiktok = this.Tiktok;
                            var elem_tiktok = ""
                            if (tiktok != "") {
                                elem_tiktok = `<li class="social-icons-tiktok"><a href="${tiktok}" target="_blank" title="TikTok"><i class="fab fa-tiktok"></i></a></li>`
                            }
                            var twitch = this.Twitch;
                            var elem_twitch = ""
                            if (twitch != "") {
                                elem_twitch = `<li class="social-icons-twitch"><a href="${twitch}" target="_blank" title="Twitch"><i class="fab fa-twitch"></i></a></li>`
                            }
                            var paginaweb = this.PaginaWeb;
                            var elem_paginaweb = ""
                            if (paginaweb != "") {
                                elem_paginaweb = `<a href="http://${paginaweb}" target="_blank" class="btn btn-modern btn-dark mt-3" data-i18n="PaginaWeb">Página web</a>`
                            }
                            var otroscontactos = ""
                            if (totalcontactos != 0) {
                                otroscontactos = `<div class="card card-default">
									                <div class="card-header" id="collapseHeading${identidad}">
										                <h6 class="card-title m-0">
											                <a class="accordion-toggle collapsed" style="cursor:pointer;" data-bs-toggle="collapse" data-bs-target="#collapse${identidad}" aria-expanded="false" aria-controls="collapse${identidad}" data-i18n="OtrosContactos" onclick="otrosContactos('${identidad}')">
												                Otros contactos
											                </a>
										                </h6>
									                </div>
									                <div id="collapse${identidad}" class="collapse" aria-labelledby="collapseHeading${identidad}" style="">
										                <div class="card-body p-3">
											               <table class="table text-1" id="tblOtrosContactos${identidad}" style="width:100%">
                                                               <thead>
                                                                   <tr>
                                                                        <th data-i18n="Cargo">Cargo</th>
                                                                        <th data-i18n="Nombre">Nombre</th>
                                                                        <th data-i18n="Telefono">Telefono</th>
                                                                        <th data-i18n="Email">Email</th>
                                                                   </tr>
                                                               </thead>
										                        <tbody id="datosOtrosContactos${identidad}"></tbody>
									                        </table>
										                </div>
									                </div>
								                </div>`
                            }
                            var email = this.Email;
                            var telefono = this.Telefono;

                            var logo = "https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/200x200/sinescudo.png"
                            if (tienelogo) {
                                logo ="https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/200x200/" + identidad + ".png?v=" + Date.now()
                            }
                            var logoimpar = ""
                            var logopar=""
                            if (i % 2 === 0) {
                                logopar = `<div class="col-md-3 order-md-2 mb-4 mb-lg-0 appear-animation animated fadeInRightShorter appear-animation-visible" data-appear-animation="fadeInRightShorter" style="animation-delay: 100ms;">
                                                <img src="${logo}" style="width:100%;height:auto;" alt="">
                                            </div>`
                            } else {
                                logoimpar = `<div class="col-md-3 order-md-2 mb-4 mb-lg-0 appear-animation animated fadeInRightShorter appear-animation-visible" data-appear-animation="fadeInRightShorter" style="animation-delay: 100ms;">
                                                <img src="${logo}" style="width:100%;height:auto;" alt="">
                                            </div>`
                            }
                            var display_rrss = "d-none"
                            if (twitter != "" || facebook != "" || instagram != "" || youtube != "" || pinterest != "" || tiktok != "" || twitch != "") {
                                display_rrss = ""
                            }
                            var template = `<div class="row">
                                ${logoimpar}
                                <div class="col-md-9 order-2" >
                                    <div class="overflow-hidden">
                                        <h2 class="text-color-dark font-weight-bold text-6 mb-0 pt-0 mt-0 appear-animation animated maskUp appear-animation-visible" data-appear-animation="maskUp" data-appear-animation-delay="300" style="animation-delay: 300ms;">${denoequipo}</h2>
                                    </div>
                                    <div class="overflow-hidden mb-3">
                                        <p class="font-weight-bold text-primary text-uppercase mb-0 appear-animation animated maskUp appear-animation-visible" data-appear-animation="maskUp" data-appear-animation-delay="500" style="animation-delay: 500ms;">${municipio} - ${provincia}</p>
                                    </div>
                                    <div  class="lead appear-animation animated fadeInUpShorter appear-animation-visible" data-appear-animation="fadeInUpShorter"  data-appear-animation-delay="700" style="animation-delay: 700ms;">
                                    <table class="table text-1">
										<tbody>
											<tr>
												<td class="py-1">
													<span class="fw-bold" data-i18n="Provincia">Provincia</span>
												</td>
												<td class="py-1">
													${provincia}
												</td>
											</tr>
											<tr>
												<td class="py-1">
													<span class="fw-bold" data-i18n="Municipio">Municipio</span>
												</td>
												<td class="py-1">
													${municipio}
												</td>
											</tr>
											<tr>
												<td class="py-1">
													<span class="fw-bold" data-i18n="Contacto">Contacto</span>
												</td>
												<td class="py-1">
													<a href="mailto:${email}" target="_blank">${email}</a>
												</td>
											</tr>
											<tr>
												<td class="py-1">
													<span class="fw-bold" data-i18n="Telefono">Teléfono</span>
												</td>
												<td class="py-1">
													${telefono}
												</td>
											</tr>
										</tbody>
									</table>
                                    ${otroscontactos}
                                    </div>
                                    <hr class="solid my-4 appear-animation animated fadeInUpShorter appear-animation-visible" data-appear-animation="fadeInUpShorter" data-appear-animation-delay="900" style="animation-delay: 900ms;">
                                    <div class="row align-items-center appear-animation animated fadeInUpShorter appear-animation-visible" data-appear-animation="fadeInUpShorter" data-appear-animation-delay="1000" style="animation-delay: 1000ms;">
                                        <div class="col-lg-6">
                                            ${elem_paginaweb}
                                        </div>
                                        <div class="col-sm-6 text-lg-end my-4 my-lg-0">
                                            <strong class="text-uppercase text-1 me-3 text-dark ${display_rrss}" data-i18n="Siguenos">Síguenos</strong>
                                            <ul class="social-icons float-lg-end">
                                                ${elem_facebook}
                                                ${elem_twitter}
                                                ${elem_instagram}
                                                ${elem_youtube}
                                                ${elem_pinterest}
                                                ${elem_tiktok}
                                                ${elem_twitch}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                ${logopar}
                            </div >`
                            html+=template
                            var template2 =`<div class="row">
                                                <div class="col">
                                                    <hr class="solid my-5">
                                                </div>
                                            </div>`
                            
                            if (i < datos.length - 1) {
                                html+=template2
                            }

                        });

                        $('.teamsCards').html(html)
                        if (info.error == true) {
                            /* Si hemos enviado por JSON un error, lo notificamos */
                            console.log('Error detectado:', info);
                            return;
                        }
                    }
                } catch (error) {
                    /* Si el JSON está mal, notificamos su contenido */
                    console.log('ERROR. Recibido:' + error, response);
                    
                }
            },

            /* En caso de error XHR mostramos el error (pasará los parámetros a console.log) */
            error: function error(_error) {
                console.log(JSON.stringify(_error));
            }
        });
    });
}
function otrosContactos(identidad) {
    if ($('#datosOtrosContactos' + identidad).html()!=""){
        return false;
    }
    var html=""
    var parametros = {
        identidad:identidad
    }
    parametros = JSON.stringify(parametros);
    $(function () {
        $.ajax({
            type: "POST",
            url: "/webservices/WSWeb.asmx/GetOtrosContactosEntidad",
            data: parametros,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function success(response) {
                try {
                    /*Si el JSON está mal formado se generará una excepción */
                    var info = response;
                    var datos = response.d;
                    if (datos == "") {

                    } else {
                        datos = $.parseJSON(datos)
                        
                        $(datos).each(function (i) {
                            var nombre = this.Nombre;
                            var cargo = this.Cargo;
                            var email = this.Email;
                            var telefono = this.Telefono;
                            var template = `<tr>
                                                <td>${cargo}</td>
                                                <td>${nombre}</td>
                                                <td>${telefono}</td>
                                                <td>${email}</td>
                                            </tr>`
                                            html+=template
                        });

                        $('#datosOtrosContactos' + identidad).html(html)
                        $('#tblOtrosContactos' + identidad).DataTable({
                            language: {
                                "url": idiomaDT()
                            },
                            responsive: true,
                            paging: false,
                            searching: false,
                            info: false,
                            ordering: false
                        })
                        if (info.error == true) {
                            /* Si hemos enviado por JSON un error, lo notificamos */
                            console.log('Error detectado:', info);
                            return;
                        }
                    }
                } catch (error) {
                    /* Si el JSON está mal, notificamos su contenido */
                    console.log('ERROR. Recibido:' + error, response);

                }
            },

            /* En caso de error XHR mostramos el error (pasará los parámetros a console.log) */
            error: function error(_error) {
                console.log(JSON.stringify(_error));
            }
        });
    });
}
function abrirRFEP() {
    let modalidad = $('#prmIdModalidad').val()
    let url = ""
    switch (modalidad) {
        case 'hp':
            url = "https://www.hockeypatines.fep.es"
            break;
        case 'hl':
            url = "https://www.hockeylinea.fep.es"
            break;
        default:
            url = "https://www.hockeypatines.fep.es"
    }
    window.open(url,"_blank")
}
//PRUEBAS


    function initializeMasonry() {
            var elem = document.querySelector('.masonry');
    var msnry = new Masonry(elem, {
        itemSelector: '.masonry-item',
    columnWidth: '.masonry-item',
    percentPosition: true
            });

    return msnry; // Retornar la instancia de Masonry si deseas reutilizarla
        }

    // Llamar la función cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', function () {
            var masonryInstance = initializeMasonry();
        });

    // Función para ejecutar después de cargar contenido dinámico
    function updateMasonryAfterContentLoad() {
            var masonryInstance = initializeMasonry();
    masonryInstance.layout();  // Recalcular el layout de Masonry
}
// Constante para definir el movimiento máximo permitido (en píxeles) 
// para considerar la acción como un "tap" o "click" y no como zoom/scroll.
const MAX_MOVEMENT = 10;

// Almacena las coordenadas iniciales del toque y la tarjeta afectada.
let touchStart = {
    x: 0,
    y: 0,
    card: null
};

/**
 * Función para obtener las coordenadas X e Y de un evento (PointerEvent o TouchEvent).
 */
function getCoords(e) {
    if (e.touches && e.touches.length > 0) {
        // TouchEvent: usa el primer punto de toque
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    // PointerEvent, MouseEvent, etc.
    return { x: e.clientX, y: e.clientY };
}

/**
 * Función que extrae los nombres de los equipos de la tarjeta.
 */
function getLocVisFromCard(card) {
    const names = card.querySelectorAll('.marcador_equipo_name');
    const loc = names[0]?.textContent.trim() || '';
    const vis = names[1]?.textContent.trim() || '';
    return { loc, vis };
}

/**
 * Lógica central para abrir el detalle de la tarjeta.
 */
function openCardDetail(card) {
    // Si ya tienes inline onclick, esto evita doble apertura si llegó el click también:
    if (card.__openedOnce) return;
    card.__openedOnce = true;
    setTimeout(() => card.__openedOnce = false, 300);

    const id = card.dataset.idpartido || '';
    const { loc, vis } = getLocVisFromCard(card);
    // Asegúrate de que abrirPartido esté disponible globalmente.
    if (typeof abrirPartido === 'function') {
        abrirPartido(String(id), loc, vis);
    }
}

// ====================================================================
// EVENTOS DE INICIO (DOWN/START): REGISTRAN LA POSICIÓN INICIAL
// ====================================================================

// A. Pointer Down (Moderno) - Guarda la posición inicial
document.addEventListener('pointerdown', function (e) {
    const card = e.target.closest && e.target.closest('.marcador_partido:not(.rfep)');
    if (card) {
        const coords = getCoords(e);
        touchStart.x = coords.x;
        touchStart.y = coords.y;
        touchStart.card = card;
    } else {
        // Limpia si el toque no empezó en una tarjeta relevante
        touchStart.card = null;
    }
}, { capture: true });

// B. Touch Start (Fallback/Legacy) - Guarda la posición inicial
document.addEventListener('touchstart', function (e) {
    const card = e.target.closest && e.target.closest('.marcador_partido:not(.rfep)');
    if (card) {
        const coords = getCoords(e);
        touchStart.x = coords.x;
        touchStart.y = coords.y;
        touchStart.card = card;
    } else {
        touchStart.card = null;
    }
}, { capture: true, passive: true });


// ====================================================================
// EVENTOS DE FIN (UP/END): COMPRUEBAN EL MOVIMIENTO Y EJECUTAN LA ACCIÓN
// ====================================================================

// 1) pointerup (moderno y fiable) - COMPRUEBA MOVIMIENTO
document.addEventListener('pointerup', function (e) {
    const currentCard = e.target.closest && e.target.closest('.marcador_partido:not(.rfep)');

    // 1. Debe haber un toque inicial registrado Y el evento final debe estar en la misma tarjeta
    if (!currentCard || currentCard !== touchStart.card) {
        touchStart.card = null;
        return;
    }

    const endCoords = getCoords(e);
    // Calcula la distancia euclidiana (Pythagoras)
    const dx = endCoords.x - touchStart.x;
    const dy = endCoords.y - touchStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    touchStart.card = null; // Reinicia el estado

    // 2. Solo abre si la distancia es menor al umbral (no fue un zoom/scroll)
    if (distance < MAX_MOVEMENT) {
        openCardDetail(currentCard);
    }
}, { capture: true });

// 2) fallback específico para WebViews (touchend) - COMPRUEBA MOVIMIENTO
document.addEventListener('touchend', function (e) {
    const currentCard = e.target.closest && e.target.closest('.marcador_partido:not(.rfep)');

    // 1. Debe haber un toque inicial registrado Y el evento final debe estar en la misma tarjeta
    if (!currentCard || currentCard !== touchStart.card) {
        touchStart.card = null;
        return;
    }

    // Usa changedTouches para touchend para obtener la posición final
    const endCoords = e.changedTouches.length > 0
        ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
        : getCoords(e); // Fallback por si acaso

    // Calcula la distancia euclidiana
    const dx = endCoords.x - touchStart.x;
    const dy = endCoords.y - touchStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    touchStart.card = null; // Reinicia el estado

    // 2. Solo abre si la distancia es menor al umbral
    if (distance < MAX_MOVEMENT) {
        // e.preventDefault() podría ser útil aquí para evitar un 'click' fantasma
        openCardDetail(currentCard);
    }
}, { capture: true, passive: true });


// QoL: elimina el tap-delay y gestos que pueden “comerse” el click
document.documentElement.style.touchAction = 'manipulation';



        
